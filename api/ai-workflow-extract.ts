import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { withTimeout } from './middleware/timeout.js';
import { withCSRF } from './middleware/csrf.js';
import { checkRateLimit, sendRateLimitError, addRateLimitHeaders } from './middleware/rateLimit.js';

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

const MULTI_WORKFLOW_EXTRACTION_PROMPT = `Sei un assistente esperto nell'analisi di processi aziendali.

Il tuo compito è analizzare un documento (testo libero, JSON, o qualsiasi formato) e identificare TUTTI i singoli step/fasi del processo descritto, restituendo un array di workflow strutturati.

IMPORTANTE: Devi rispondere SOLO con un array JSON valido, senza testo aggiuntivo prima o dopo.

PER OGNI STEP/FASE ESTRAI:
- fase: string - la macro-fase del processo (es: "Analisi", "Produzione", "Controllo", "Pianificazione", "Esecuzione", "Verifica", "Vendite", "Marketing", "HR", "IT", "Finanza", "Customer Service", "Operazioni")
- titolo: string (max 60 caratteri, descrittivo dello step specifico)
- descrizione: string (dettagliata, cosa si fa concretamente in questo step)
- tool: array di stringhe (strumenti/software usati)
- input: array di stringhe (cosa serve per iniziare questo step)
- output: array di stringhe (cosa viene prodotto da questo step)
- tempoMedio: number (minuti per singola esecuzione, stima ragionevole)
- frequenza: number (quante volte al mese viene eseguito: giornaliero=20, settimanale=4, mensile=1)
- painPoints: string (problemi/difficoltà, stringa vuota se non menzionati)
- pii: boolean (true se contiene dati personali sensibili)
- hitl: boolean (true se richiede supervisione/decisione umana)
- citazioni: boolean (true se serve citare fonti)

REGOLE CRITICHE:
1. Identifica OGNI step distinto del processo. Se il testo descrive 5 attività diverse, restituisci 5 oggetti.
2. Ogni step deve essere un'attività concreta e separata, non una categoria generica.
3. Se il testo è un elenco puntato o numerato, ogni punto è probabilmente uno step.
4. Se è un testo discorsivo, identifica i verbi d'azione principali come step separati.
5. Se è un JSON con dati strutturati, estrai ogni elemento come workflow.
6. Per ogni step, assegna la fase macro più appropriata tra quelle standard.
7. Stima tempi e frequenze in modo realistico se non specificati.
8. L'output e l'input di step consecutivi dovrebbero essere coerenti (l'output di uno è spesso l'input del successivo).

FORMATO OUTPUT (array JSON valido):
[
  {
    "fase": "Analisi",
    "titolo": "Raccolta dati vendite",
    "descrizione": "Scarico i dati di vendita dal CRM e li organizzo in un foglio Excel",
    "tool": ["CRM", "Excel"],
    "input": ["Accesso CRM", "Credenziali"],
    "output": ["Foglio Excel con dati vendite"],
    "tempoMedio": 30,
    "frequenza": 4,
    "painPoints": "Dati in formati diversi, export lento",
    "pii": true,
    "hitl": false,
    "citazioni": false
  },
  {
    "fase": "Produzione",
    "titolo": "Creazione report settimanale",
    "descrizione": "Elaboro i dati raccolti e creo il report con grafici e KPI",
    "tool": ["Excel", "PowerPoint"],
    "input": ["Foglio Excel con dati vendite"],
    "output": ["Report PowerPoint", "PDF riepilogativo"],
    "tempoMedio": 60,
    "frequenza": 4,
    "painPoints": "Formule complesse, formattazione manuale",
    "pii": false,
    "hitl": true,
    "citazioni": false
  }
]

Analizza il documento fornito e restituisci TUTTI gli step come array JSON.`;

async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const reqId = Math.random().toString(36).substring(2, 8);
  const log = (level: string, msg: string, data?: any) => {
    const ts = new Date().toISOString();
    const extra = data ? ` | ${JSON.stringify(data)}` : '';
    console.log(`[${ts}] [${reqId}] [EXTRACT] [${level}] ${msg}${extra}`);
  };

  try {
    log('INFO', 'Request received', {
      method: req.method,
      origin: req.headers.origin || 'none',
      referer: req.headers.referer || 'none',
      hasApiKey: !!req.headers['x-openrouter-key'],
      contentType: req.headers['content-type'],
      bodyKeys: req.body ? Object.keys(req.body) : [],
    });

    // Rate limiting - 10 requests per minute per IP
    const rateLimit = checkRateLimit(req, {
      maxAttempts: 10,
      windowMs: 60 * 1000, // 1 minute
      keyPrefix: 'workflow-extract:',
    });

    if (!rateLimit.allowed) {
      log('WARN', 'Rate limit exceeded');
      return sendRateLimitError(res, rateLimit.retryAfter || 60);
    }

    if (rateLimit.remaining !== undefined) {
      addRateLimitHeaders(res, rateLimit.remaining, 10);
    }

    // User-provided key from header (required - no server fallback)
    const userKey = req.headers['x-openrouter-key'];
    const apiKey = typeof userKey === 'string' ? userKey : undefined;

    if (!apiKey) {
      log('WARN', 'No API key provided in x-openrouter-key header');
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

    const { description, multi } = req.body;

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      log('WARN', 'Invalid description', { type: typeof description, length: description?.length });
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }

    const isMulti = multi === true;
    log('INFO', 'Processing', { descLength: description.length, keyPrefix: apiKey.substring(0, 8), multi: isMulti });

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
    const systemPrompt = isMulti ? MULTI_WORKFLOW_EXTRACTION_PROMPT : WORKFLOW_EXTRACTION_PROMPT;
    const userContent = isMulti
      ? `DOCUMENTO DA ANALIZZARE:\n\n${description}`
      : `DESCRIZIONE WORKFLOW:\n\n${description}`;
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userContent },
    ];

    let completion;
    let model = '';

    for (let i = 0; i < models.length; i++) {
      try {
        log('INFO', `Trying model ${i + 1}/${models.length}: ${models[i]}`);
        const t0 = Date.now();
        completion = await openrouter.chat.completions.create({
          model: models[i],
          messages,
          temperature: 0.3,
        });
        model = models[i];
        log('INFO', `Model succeeded`, { model, elapsed: `${Date.now() - t0}ms` });
        break;
      } catch (err: any) {
        log('WARN', `Model failed`, {
          model: models[i],
          status: err.status,
          message: err.message?.substring(0, 200),
          code: err.code,
        });
        if (i === models.length - 1) throw err;
      }
    }

    // Strip thinking tags from models that use them (e.g., Qwen)
    const rawContent = completion!.choices[0]?.message?.content || '';
    const hadThinkTags = rawContent.includes('<think>');
    const responseText = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    log('INFO', 'AI response received', {
      rawLength: rawContent.length,
      cleanLength: responseText.length,
      hadThinkTags,
      finishReason: completion!.choices[0]?.finish_reason,
      preview: responseText.substring(0, 100),
    });

    // Parse JSON response
    let extractedData;
    try {
      if (isMulti) {
        // Multi mode: expect an array
        const arrayMatch = responseText.match(/\[[\s\S]*\]/);
        if (!arrayMatch) {
          // Fallback: try single object and wrap in array
          const objMatch = responseText.match(/\{[\s\S]*\}/);
          if (!objMatch) {
            log('ERROR', 'No JSON found in AI response (multi)', {
              responsePreview: responseText.substring(0, 300),
            });
            throw new Error('No JSON found in response');
          }
          extractedData = [JSON.parse(objMatch[0])];
        } else {
          extractedData = JSON.parse(arrayMatch[0]);
        }
        if (!Array.isArray(extractedData)) {
          extractedData = [extractedData];
        }
        log('INFO', 'Multi JSON parsed', { count: extractedData.length });
      } else {
        // Single mode: expect an object
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          log('ERROR', 'No JSON object found in AI response', {
            responsePreview: responseText.substring(0, 300),
          });
          throw new Error('No JSON found in response');
        }
        extractedData = JSON.parse(jsonMatch[0]);
        log('INFO', 'JSON parsed successfully', { fields: Object.keys(extractedData) });
      }
    } catch (parseError: any) {
      log('ERROR', 'JSON parse failed', {
        parseError: parseError.message,
        responsePreview: responseText.substring(0, 500),
      });
      return res.status(500).json({
        error: 'Failed to parse AI response',
        details: 'Invalid JSON structure in AI response'
      });
    }

    if (isMulti) {
      // Validate each workflow in array
      const required = ['fase', 'titolo', 'descrizione', 'tool', 'input', 'output', 'tempoMedio', 'frequenza'];
      const validWorkflows = extractedData.filter((wf: any) => {
        const missing = required.filter(field => !(field in wf));
        if (missing.length > 0) {
          log('WARN', 'Skipping workflow with missing fields', { missing, titolo: wf.titolo });
          return false;
        }
        if (typeof wf.tempoMedio !== 'number') wf.tempoMedio = parseInt(wf.tempoMedio) || 30;
        if (typeof wf.frequenza !== 'number') wf.frequenza = parseInt(wf.frequenza) || 4;
        if (!Array.isArray(wf.tool)) wf.tool = typeof wf.tool === 'string' ? [wf.tool] : [];
        if (!Array.isArray(wf.input)) wf.input = typeof wf.input === 'string' ? [wf.input] : [];
        if (!Array.isArray(wf.output)) wf.output = typeof wf.output === 'string' ? [wf.output] : [];
        return true;
      });

      if (validWorkflows.length === 0) {
        return res.status(500).json({
          error: 'Nessun workflow valido estratto dal documento.',
          details: 'AI non ha prodotto workflow con tutti i campi richiesti'
        });
      }

      log('INFO', 'MULTI SUCCESS', { count: validWorkflows.length, model });

      return res.status(200).json({
        success: true,
        workflows: validWorkflows,
        model
      });
    }

    // Single mode validation
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

    log('INFO', 'SUCCESS', { titolo: extractedData.titolo, model });

    return res.status(200).json({
      success: true,
      workflow: extractedData,
      model
    });

  } catch (error: any) {
    log('ERROR', 'FAILED', {
      errorType: error.constructor?.name,
      status: error.status,
      code: error.code,
      message: error.message?.substring(0, 300),
      stack: error.stack?.split('\n').slice(0, 3).join(' | '),
    });

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

    return res.status(statusCode).json({
      error: userMessage,
      details: `${error.status || 'unknown'}: ${error.message?.substring(0, 200) || 'No details'}`,
    });
  }
}

// Export handler with CSRF protection and timeout
export default withCSRF(
  withTimeout(handler, {
    timeoutMs: 25000, // 25 seconds (5-model fallback needs more time)
    message: 'Workflow extraction took too long. Please try again.'
  })
);
