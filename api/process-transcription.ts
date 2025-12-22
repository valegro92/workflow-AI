import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { withTimeout } from './middleware/timeout';
import { withCSRF } from './middleware/csrf';
import { checkRateLimit, sendRateLimitError, addRateLimitHeaders } from './middleware/rateLimit';

// Prompt ottimizzato per estrarre workflow con focus sui FLUSSI di processo
const EXTRACTION_PROMPT = `Sei un esperto di Business Process Engineering e mappatura processi aziendali.

OBIETTIVO: Analizza questa trascrizione e mappa i FLUSSI DI PROCESSO completi.
Devi identificare non solo le singole attività, ma come si collegano tra loro formando flussi end-to-end.

REGOLE FONDAMENTALI PER LA CREAZIONE DEI FLUSSI:
1. SEQUENZIALITA': Ordina i workflow nell'ordine in cui vengono eseguiti (l'output di uno diventa input del successivo)
2. RAGGRUPPAMENTO: Usa la stessa "fase" per workflow che appartengono allo stesso macro-processo
3. DIPENDENZE: L'output di un workflow deve corrispondere all'input del workflow successivo nel flusso
4. GRANULARITA': Ogni workflow deve essere un'attività atomica e misurabile (15-120 minuti tipicamente)
5. COMPLETEZZA: Mappa l'intero flusso dall'input iniziale all'output finale

Per ogni workflow/step del flusso, estrai:
- fase: il nome del MACRO-PROCESSO a cui appartiene (es: "Gestione Ordini", "Onboarding Cliente", "Reportistica Mensile")
- titolo: titolo breve dell'attività specifica (max 50 caratteri, usa verbi all'infinito: "Verificare...", "Elaborare...", "Inviare...")
- descrizione: cosa viene fatto esattamente, con quale scopo (2-3 frasi chiare)
- tool: array di strumenti/software utilizzati (es: ["Excel", "SAP", "Email", "CRM"])
- input: array di input necessari - DEVE includere gli output del workflow precedente se fa parte di un flusso
- output: array di output prodotti - questi diventano input del workflow successivo
- tempoMedio: tempo medio in MINUTI per singola esecuzione (stima realistica: 15-480 min)
- frequenza: quante volte al MESE viene eseguito (1-100 tipicamente)
- painPoints: problemi, colli di bottiglia, frustrazioni menzionati (stringa descrittiva)
- pii: true se gestisce dati personali/sensibili (nomi, email, dati finanziari personali)
- hitl: true se richiede decisione/approvazione umana critica
- citazioni: true se necessita fonti esterne verificabili
- owner: ruolo o nome del responsabile (se menzionato)
- note: dipendenze, vincoli, eccezioni importanti (es: "Precede l'approvazione del manager", "Richiede dati dal CRM")

ESEMPIO DI FLUSSO BEN MAPPATO:
Processo "Gestione Preventivi":
1. Ricezione richiesta → Output: "Richiesta preventivo registrata"
2. Analisi requisiti → Input: "Richiesta preventivo registrata" → Output: "Specifiche tecniche definite"
3. Calcolo costi → Input: "Specifiche tecniche definite" → Output: "Preventivo elaborato"
4. Approvazione interna → Input: "Preventivo elaborato" → Output: "Preventivo approvato"
5. Invio al cliente → Input: "Preventivo approvato" → Output: "Preventivo inviato"

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

IMPORTANTE:
- I workflow devono essere ordinati nella sequenza logica del flusso
- Workflow della stessa fase devono essere consecutivi
- Se identifichi più processi distinti, raggruppali per fase diversa
- Se la trascrizione non contiene processi chiari, ritorna array vuoto

TRASCRIZIONE DA ANALIZZARE:
`;

// Maximum text length allowed (approximately 100,000 characters)
const MAX_TEXT_LENGTH = 100000;

async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== PROCESS TRANSCRIPTION START ===');

    // 1. Rate limiting - 10 requests per 5 minutes per IP (cheaper than audio, so more generous)
    const rateLimit = checkRateLimit(req, {
      maxAttempts: 10,
      windowMs: 5 * 60 * 1000, // 5 minutes
      keyPrefix: 'process-transcription:',
    });

    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for transcription processing`);
      return sendRateLimitError(res, rateLimit.retryAfter || 300);
    }

    if (rateLimit.remaining !== undefined) {
      addRateLimitHeaders(res, rateLimit.remaining, 10);
    }

    // 2. Check API key
    if (!process.env.OPENROUTER_KEY) {
      console.error('OPENROUTER_KEY not configured');
      return res.status(500).json({ error: 'Server misconfiguration: OPENROUTER_KEY missing' });
    }

    // Initialize OpenRouter client
    const openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });

    console.log('✓ OpenRouter client initialized');

    // 3. Parse and validate request body
    const { transcription, filename, format, speakers } = req.body;

    if (!transcription || typeof transcription !== 'string') {
      console.error('No transcription text in request body');
      return res.status(400).json({ error: 'No transcription text provided' });
    }

    if (transcription.trim().length === 0) {
      return res.status(400).json({ error: 'Transcription text is empty' });
    }

    if (transcription.length > MAX_TEXT_LENGTH) {
      console.error(`Transcription too long: ${transcription.length} chars (max ${MAX_TEXT_LENGTH})`);
      return res.status(400).json({
        error: `Trascrizione troppo lunga. Massimo ${MAX_TEXT_LENGTH.toLocaleString()} caratteri consentiti.`,
        length: transcription.length,
        maxLength: MAX_TEXT_LENGTH
      });
    }

    console.log(`Filename: ${filename || 'unknown'}`);
    console.log(`Format detected: ${format || 'unknown'}`);
    console.log(`Speakers found: ${speakers?.length || 0}`);
    console.log(`Transcription length: ${transcription.length} chars`);
    console.log(`Preview: ${transcription.substring(0, 150)}...`);

    // 4. Extract workflows with OpenRouter (with fallback)
    console.log('Calling OpenRouter for workflow extraction...');

    let completion;
    let modelUsed = 'google/gemini-2.0-flash-exp:free';

    try {
      console.log('Trying primary model: google/gemini-2.0-flash-exp:free');
      completion = await openrouter.chat.completions.create({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          {
            role: 'user',
            content: EXTRACTION_PROMPT + '\n\n' + transcription,
          },
        ],
        response_format: { type: 'json_object' },
      });
    } catch (primaryError: any) {
      // If rate limited (429) or capacity issue, try fallback model
      if (primaryError.status === 429 || primaryError.message?.includes('rate') || primaryError.message?.includes('capacity')) {
        console.log('Primary model saturated (429), trying fallback: meta-llama/llama-3.3-70b-instruct:free');
        modelUsed = 'meta-llama/llama-3.3-70b-instruct:free';

        completion = await openrouter.chat.completions.create({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [
            {
              role: 'user',
              content: EXTRACTION_PROMPT + '\n\n' + transcription,
            },
          ],
          response_format: { type: 'json_object' },
        });
      } else {
        // Re-throw if not a rate limit error
        throw primaryError;
      }
    }

    const extractedText = completion.choices[0]?.message?.content || '{}';
    console.log(`✓ Extraction completed with ${modelUsed}: ${extractedText.length} chars`);
    console.log(`Preview: ${extractedText.substring(0, 150)}...`);

    // 5. Parse AI response with error handling
    let result;
    try {
      result = JSON.parse(extractedText);
    } catch (parseError: any) {
      console.error('=== JSON PARSE ERROR ===');
      console.error('Parse error:', parseError.message);
      console.error('Raw AI response:', extractedText);

      return res.status(500).json({
        error: "L'AI non ha prodotto un JSON valido. Riprova con una trascrizione più strutturata.",
        details: `JSON parse error: ${parseError.message}`,
        rawResponse: extractedText.substring(0, 500),
      });
    }

    // 6. Validate and transform workflows
    if (!result || !Array.isArray(result.workflows)) {
      console.error('Invalid result structure:', result);
      return res.status(500).json({
        error: "L'AI ha restituito una struttura dati non valida.",
        details: 'Expected object with workflows array',
        received: typeof result,
      });
    }

    // Validate and sanitize workflow data from AI
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
      // Validate required fields
      if (!w.titolo || !w.tempoMedio || !w.frequenza) {
        console.warn(`Skipping invalid workflow at index ${index}: missing required fields`);
        return null;
      }

      // Validate numeric bounds
      const tempoMedio = typeof w.tempoMedio === 'number' ? w.tempoMedio : parseFloat(String(w.tempoMedio));
      const frequenza = typeof w.frequenza === 'number' ? w.frequenza : parseFloat(String(w.frequenza));

      if (isNaN(tempoMedio) || tempoMedio < 0 || tempoMedio > 10000) {
        console.warn(`Skipping invalid workflow: tempoMedio out of bounds (${tempoMedio})`);
        return null;
      }

      if (isNaN(frequenza) || frequenza < 0 || frequenza > 1000) {
        console.warn(`Skipping invalid workflow: frequenza out of bounds (${frequenza})`);
        return null;
      }

      // Validate arrays
      const tool = Array.isArray(w.tool) ? w.tool : [];
      const input = Array.isArray(w.input) ? w.input : [];
      const output = Array.isArray(w.output) ? w.output : [];

      return {
        ...w,
        id: `W${String(index + 1).padStart(3, '0')}`,
        tempoMedio,
        frequenza,
        tempoTotale: tempoMedio * frequenza,
        tool,
        input,
        output,
      };
    }).filter(Boolean);

    console.log(`✓ Created ${workflows.length} workflows from transcription`);
    console.log('=== PROCESS TRANSCRIPTION SUCCESS ===');

    return res.status(200).json({
      success: true,
      workflows,
      source: {
        type: 'transcription',
        filename: filename || 'unknown',
        format: format || 'txt',
        speakersDetected: speakers?.length || 0,
        textLength: transcription.length,
      }
    });

  } catch (error: any) {
    console.error('=== PROCESS TRANSCRIPTION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Provide user-friendly error messages
    let userMessage = 'Error processing transcription';
    let statusCode = 500;

    if (error.status === 429 || error.message?.includes('rate') || error.message?.includes('capacity')) {
      userMessage = 'OpenRouter è temporaneamente saturo. Riprova tra 5-10 minuti oppure carica una trascrizione più breve.';
      statusCode = 503;
    } else if (error.message?.includes('parse') || error.message?.includes('JSON')) {
      userMessage = "L'AI non è riuscita a estrarre workflow validi dalla trascrizione. Prova con un testo più strutturato.";
    }

    const response: { error: string; details?: string; type?: string } = {
      error: userMessage
    };

    if (process.env.NODE_ENV === 'development') {
      response.details = error.message;
      response.type = error.constructor.name;
    }

    return res.status(statusCode).json(response);
  }
}

// Export handler with CSRF protection and timeout
export default withCSRF(
  withTimeout(handler, {
    timeoutMs: 30000, // 30 seconds (no transcription needed, just LLM extraction)
    message: 'Transcription processing took too long. Try with a shorter text.'
  })
);
