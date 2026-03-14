import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { withTimeout } from './middleware/timeout';
import { withCSRF } from './middleware/csrf';
import { checkRateLimit, sendRateLimitError, addRateLimitHeaders } from './middleware/rateLimit';

// Initialize OpenAI client inside handler to avoid serverless memory leaks

const WORKFLOW_EXTRACTION_PROMPT = `Sei un assistente esperto nell'analisi di processi aziendali.

Il tuo compito è estrarre informazioni strutturate da una descrizione testuale di un workflow aziendale.

IMPORTANTE: Devi rispondere SOLO con un oggetto JSON valido, senza testo aggiuntivo prima o dopo.

CAMPI DA ESTRARRE:
- fase: string (es: "Vendite", "Marketing", "Operazioni", "HR", "IT", "Finanza", "Customer Service")
- titolo: string (max 60 caratteri, descrittivo)
- descrizione: string (dettagliata)
- tool: array di stringi (strumenti/software usati, es: ["Excel", "Email", "CRM"])
- input: array di stringhe (cosa serve per iniziare, es: ["Dati vendite", "Report precedente"])
- output: array di stringhe (cosa viene prodotto, es: ["Report Excel", "Email al team"])
- tempoMedio: number (minuti per singola esecuzione, stima ragionevole)
- frequenza: number (quante volte al mese viene eseguito)
- painPoints: string (problemi/difficoltà menzionati, se presenti)
- pii: boolean (true se contiene dati personali sensibili come email clienti, nomi, telefoni)
- hitl: boolean (true se richiede supervisione/decisione umana)
- citazioni: boolean (true se serve citare fonti)

REGOLE:
1. Se un campo non è menzionato nel testo, usa valori sensati di default
2. Per tempoMedio: stima in base alla complessità descritta (es: "2 ore" = 120)
3. Per frequenza: se dice "ogni settimana" = 4, "ogni giorno lavorativo" = 20, "mensile" = 1
4. Per tool: estrai nomi comuni (Excel, Word, Email, CRM, etc.)
5. Sii conservativo con pii=true (solo se davvero menziona dati sensibili)
6. hitl=true se menziona "revisione", "approvazione", "decisione", "controllo qualità"

FORMATO OUTPUT (JSON valido):
{
  "fase": "Marketing",
  "titolo": "Creazione report settimanale campagne",
  "descrizione": "Analisi performance campagne pubblicitarie e creazione report per il management",
  "tool": ["Google Ads", "Excel", "Email"],
  "input": ["Dati campagne Google Ads", "Budget speso"],
  "output": ["Report Excel", "Email riepilogativa"],
  "tempoMedio": 90,
  "frequenza": 4,
  "painPoints": "Dati dispersi in più piattaforme, formule Excel complesse",
  "pii": false,
  "hitl": true,
  "citazioni": false
}

Analizza il testo fornito ed estrai le informazioni in formato JSON.`;

async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== AI WORKFLOW EXTRACT START ===');

    // Rate limiting - 10 requests per minute per IP
    const rateLimit = checkRateLimit(req, {
      maxAttempts: 10,
      windowMs: 60 * 1000, // 1 minute
      keyPrefix: 'workflow-extract:',
    });

    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for workflow extraction`);
      return sendRateLimitError(res, rateLimit.retryAfter || 60);
    }

    if (rateLimit.remaining !== undefined) {
      addRateLimitHeaders(res, rateLimit.remaining, 10);
    }

    // User-provided key from header (required - no server fallback)
    const userKey = req.headers['x-openrouter-key'];
    const apiKey = typeof userKey === 'string' ? userKey : undefined;

    if (!apiKey) {
      return res.status(400).json({
        error: 'NO_API_KEY',
        message: 'Per usare l\'estrazione AI, inserisci la tua chiave OpenRouter gratuita nelle impostazioni.'
      });
    }

    // Initialize client inside handler for serverless best practices
    const openrouter = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://workflow-ai-eight.vercel.app',
        'X-Title': 'Workflow AI',
      },
    });

    const { description } = req.body;

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }

    console.log(`Description length: ${description.length} chars`);
    console.log(`API key starts with: ${apiKey.substring(0, 8)}...`);

    // 10-model fallback chain (all free on OpenRouter, ordered by capability)
    const models = [
      'nousresearch/hermes-3-llama-3.1-405b:free',
      'google/gemma-3-27b-it:free',
      'mistralai/mistral-small-3.1-24b-instruct:free',
      'openai/gpt-oss-20b:free',
      'google/gemma-3-12b-it:free',
      'qwen/qwen3-4b:free',
      'google/gemma-3-4b-it:free',
      'google/gemma-3n-e4b-it:free',
      'meta-llama/llama-3.2-3b-instruct:free',
      'google/gemma-3n-e2b-it:free',
    ];
    const messages = [
      { role: 'system' as const, content: WORKFLOW_EXTRACTION_PROMPT },
      { role: 'user' as const, content: `DESCRIZIONE WORKFLOW:\n\n${description}` },
    ];

    let completion;
    let model = '';

    for (let i = 0; i < models.length; i++) {
      try {
        console.log(`Trying model ${i + 1}/${models.length}: ${models[i]}`);
        completion = await openrouter.chat.completions.create({
          model: models[i],
          messages,
          temperature: 0.3,
        });
        model = models[i];
        break;
      } catch (err: any) {
        console.warn(`Model ${models[i]} failed: ${err.status || err.message}`);
        if (i === models.length - 1) throw err;
      }
    }

    console.log(`Model used: ${model}`);

    // Strip thinking tags from models that use them (e.g., Qwen)
    const responseText = (completion!.choices[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    console.log(`AI response length: ${responseText.length} chars`);

    // Parse JSON response
    let extractedData;
    try {
      // Try to extract JSON from response (in case AI adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      extractedData = JSON.parse(jsonMatch[0]);
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError.message);
      // Don't expose raw AI response to client for security
      if (process.env.NODE_ENV === 'development') {
        console.error('Raw response:', responseText);
      }
      return res.status(500).json({
        error: 'Failed to parse AI response',
        details: 'Invalid JSON structure in AI response'
      });
    }

    // Validate required fields and data types
    const required = ['fase', 'titolo', 'descrizione', 'tool', 'input', 'output', 'tempoMedio', 'frequenza'];
    const missing = required.filter(field => !(field in extractedData));

    if (missing.length > 0) {
      console.error('Missing required fields:', missing);
      return res.status(500).json({
        error: 'Incomplete extraction',
        message: `Missing fields: ${missing.join(', ')}`
      });
    }

    // Validate data types and bounds
    if (typeof extractedData.tempoMedio !== 'number' || extractedData.tempoMedio < 0 || extractedData.tempoMedio > 10000) {
      return res.status(500).json({
        error: 'Invalid tempoMedio',
        message: 'tempoMedio must be a number between 0 and 10000 minutes'
      });
    }

    if (typeof extractedData.frequenza !== 'number' || extractedData.frequenza < 0 || extractedData.frequenza > 1000) {
      return res.status(500).json({
        error: 'Invalid frequenza',
        message: 'frequenza must be a number between 0 and 1000'
      });
    }

    // Validate arrays
    if (!Array.isArray(extractedData.tool) || !Array.isArray(extractedData.input) || !Array.isArray(extractedData.output)) {
      return res.status(500).json({
        error: 'Invalid array fields',
        message: 'tool, input, and output must be arrays'
      });
    }

    // Validate strings
    if (typeof extractedData.titolo !== 'string' || extractedData.titolo.length > 100) {
      return res.status(500).json({
        error: 'Invalid titolo',
        message: 'titolo must be a string with max 100 characters'
      });
    }

    console.log(`✓ Successfully extracted workflow: ${extractedData.titolo}`);
    console.log('=== AI WORKFLOW EXTRACT SUCCESS ===');

    return res.status(200).json({
      success: true,
      workflow: extractedData,
      model
    });

  } catch (error: any) {
    console.error('=== AI WORKFLOW EXTRACT ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);

    let userMessage = 'Errore durante l\'estrazione del workflow.';
    let statusCode = 500;

    if (error.status === 401 || error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      userMessage = 'Chiave OpenRouter non valida. Verifica la chiave nelle impostazioni (Step 4).';
      statusCode = 401;
    } else if (error.status === 429 || error.message?.includes('rate') || error.message?.includes('capacity')) {
      userMessage = 'AI temporaneamente non disponibile. Riprova tra qualche minuto.';
      statusCode = 503;
    } else if (error.status === 402 || error.message?.includes('402')) {
      userMessage = 'Credito OpenRouter insufficiente. I modelli gratuiti richiedono solo un account, nessun credito.';
      statusCode = 402;
    }

    const response: any = {
      error: userMessage,
      // Include status code from upstream API for debugging
      details: `${error.status || 'unknown'}: ${error.message?.substring(0, 200) || 'No details'}`,
    };

    return res.status(statusCode).json(response);
  }
}

// Export handler with CSRF protection and timeout
export default withCSRF(
  withTimeout(handler, {
    timeoutMs: 25000, // 25 seconds (5-model fallback needs more time)
    message: 'Workflow extraction took too long. Please try again.'
  })
);
