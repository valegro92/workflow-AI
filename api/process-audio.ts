import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { withTimeout } from './middleware/timeout';
import { withCSRF } from './middleware/csrf';
import { checkRateLimit, sendRateLimitError, addRateLimitHeaders } from './middleware/rateLimit';

// Prompt per estrarre workflows dal transcript
const EXTRACTION_PROMPT = `Sei un esperto di mappatura processi aziendali.

Analizza questa trascrizione di un workshop e estrai i workflow/processi menzionati.

Per ogni workflow identificato, estrai:
- fase: la fase del processo (es: "Analisi", "Produzione", "Controllo", "Pianificazione", etc.)
- titolo: un titolo breve e chiaro (max 50 caratteri)
- descrizione: descrizione dettagliata di cosa viene fatto (2-3 frasi)
- tool: array di strumenti/software utilizzati (es: ["Excel", "Jira", "Email"])
- input: array di input necessari (es: ["Dati vendite", "Report precedente"])
- output: array di output prodotti (es: ["Report mensile", "Dashboard"])
- tempoMedio: tempo medio in minuti per singola esecuzione (stima ragionevole se non menzionato)
- frequenza: quante volte al mese viene eseguito (stima ragionevole se non menzionato)
- painPoints: problemi/difficoltà menzionati (stringa, può essere vuota)
- pii: true se gestisce dati personali, false altrimenti
- hitl: true se richiede supervisione umana, false altrimenti
- citazioni: true se necessita citazioni fonti, false altrimenti
- owner: chi è responsabile (se menzionato, altrimenti stringa vuota)
- note: eventuali note aggiuntive (stringa, può essere vuota)

Rispondi SOLO con un JSON valido nel formato:
{
  "workflows": [
    {
      "fase": "string",
      "titolo": "string",
      "descrizione": "string",
      "tool": ["string"],
      "input": ["string"],
      "output": ["string"],
      "tempoMedio": number,
      "frequenza": number,
      "painPoints": "string",
      "pii": boolean,
      "hitl": boolean,
      "citazioni": boolean,
      "owner": "string",
      "note": "string"
    }
  ]
}

Se la trascrizione non contiene processi chiari, ritorna array vuoto.

TRASCRIZIONE:
`;

async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== PROCESS AUDIO (TRANSCRIPT) START ===');

    // 1. Rate limiting
    const rateLimit = checkRateLimit(req, {
      maxAttempts: 10,
      windowMs: 60 * 1000, // 1 minute
      keyPrefix: 'process-audio:',
    });

    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for transcript processing`);
      return sendRateLimitError(res, rateLimit.retryAfter || 60);
    }

    if (rateLimit.remaining !== undefined) {
      addRateLimitHeaders(res, rateLimit.remaining, 10);
    }

    // 2. Check API key - user-provided only
    const userOpenRouterKey = typeof req.headers['x-openrouter-key'] === 'string'
      ? req.headers['x-openrouter-key']
      : undefined;

    if (!userOpenRouterKey) {
      return res.status(400).json({
        error: 'NO_API_KEY',
        message: 'Per usare questa funzione, inserisci la tua chiave OpenRouter gratuita.'
      });
    }

    // 3. Parse transcript from request body
    const { transcript } = req.body || {};

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 20) {
      return res.status(400).json({
        error: 'Trascrizione troppo breve. Descrivi i tuoi processi in modo più dettagliato.'
      });
    }

    console.log(`Transcript length: ${transcript.length} chars`);
    console.log(`Preview: ${transcript.substring(0, 100)}...`);

    // 4. Initialize OpenRouter client
    const openrouter = new OpenAI({
      apiKey: userOpenRouterKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });

    // 5. Extract workflows with 5-model fallback chain (all free on OpenRouter)
    const models = [
      'google/gemini-2.0-flash-exp:free',
      'openrouter/hunter-alpha',
      'nvidia/nemotron-3-super:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'deepseek/deepseek-r1:free',
    ];
    const messages = [{ role: 'user' as const, content: EXTRACTION_PROMPT + '\n\n' + transcript }];

    let completion;
    let modelUsed = '';

    for (let i = 0; i < models.length; i++) {
      try {
        console.log(`Trying model ${i + 1}/${models.length}: ${models[i]}`);
        completion = await openrouter.chat.completions.create({
          model: models[i],
          messages,
          response_format: { type: 'json_object' },
        });
        modelUsed = models[i];
        break;
      } catch (err: any) {
        console.warn(`Model ${models[i]} failed: ${err.status || err.message}`);
        if (i === models.length - 1) throw err; // last model, re-throw
      }
    }

    const extractedText = completion!.choices[0]?.message?.content || '{}';
    console.log(`Extraction completed with ${modelUsed}: ${extractedText.length} chars`);

    // 6. Parse AI response
    let result;
    try {
      result = JSON.parse(extractedText);
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError.message);
      console.error('Raw AI response:', extractedText.substring(0, 500));
      return res.status(500).json({
        error: "L'AI non ha prodotto un JSON valido. Riprova con una descrizione più chiara.",
      });
    }

    // 7. Validate and transform workflows
    if (!result || !Array.isArray(result.workflows)) {
      console.error('Invalid result structure:', result);
      return res.status(500).json({
        error: "L'AI ha restituito una struttura dati non valida.",
      });
    }

    interface WorkflowInput {
      titolo?: string;
      tempoMedio?: number | string;
      frequenza?: number | string;
      tool?: string[];
      input?: string[];
      output?: string[];
      [key: string]: unknown;
    }

    const workflows = result.workflows.map((w: WorkflowInput, index: number) => {
      if (!w.titolo || !w.tempoMedio || !w.frequenza) {
        console.warn(`Skipping invalid workflow at index ${index}: missing required fields`);
        return null;
      }

      const tempoMedio = typeof w.tempoMedio === 'number' ? w.tempoMedio : parseFloat(w.tempoMedio);
      const frequenza = typeof w.frequenza === 'number' ? w.frequenza : parseFloat(w.frequenza);

      if (isNaN(tempoMedio) || tempoMedio < 0 || tempoMedio > 10000) return null;
      if (isNaN(frequenza) || frequenza < 0 || frequenza > 1000) return null;

      return {
        ...w,
        id: `W${String(index + 1).padStart(3, '0')}`,
        tempoMedio,
        frequenza,
        tempoTotale: tempoMedio * frequenza,
        tool: Array.isArray(w.tool) ? w.tool : [],
        input: Array.isArray(w.input) ? w.input : [],
        output: Array.isArray(w.output) ? w.output : [],
      };
    }).filter(Boolean);

    console.log(`Created ${workflows.length} workflows`);
    console.log('=== PROCESS AUDIO SUCCESS ===');

    return res.status(200).json({
      success: true,
      transcription: transcript,
      workflows,
    });

  } catch (error: any) {
    console.error('=== PROCESS AUDIO ERROR ===');
    console.error('Error:', error.message);

    let userMessage = 'Errore durante l\'elaborazione.';
    let statusCode = 500;

    if (error.status === 401 || error.message?.includes('401')) {
      userMessage = 'Chiave OpenRouter non valida. Verificala nelle impostazioni.';
      statusCode = 401;
    } else if (error.status === 429 || error.message?.includes('rate') || error.message?.includes('capacity')) {
      userMessage = 'AI temporaneamente non disponibile. Riprova tra qualche minuto.';
      statusCode = 503;
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
    timeoutMs: 30000, // 30 seconds for AI processing
    message: 'Elaborazione troppo lenta. Riprova con una descrizione più breve.'
  })
);
