import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { Readable } from 'stream';
import { withTimeout } from './middleware/timeout';

// Convert Buffer to Readable stream with filename
function bufferToFile(buffer: Buffer, filename: string): any {
  const stream = Readable.from(buffer) as any;
  stream.path = filename; // OpenAI SDK needs this
  return stream;
}

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
    console.log('=== PROCESS AUDIO START ===');

    // 1. Check API keys FIRST (before anything else)
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY not configured');
      return res.status(500).json({ error: 'Server misconfiguration: GROQ_API_KEY missing' });
    }
    if (!process.env.OPENROUTER_KEY) {
      console.error('OPENROUTER_KEY not configured');
      return res.status(500).json({ error: 'Server misconfiguration: OPENROUTER_KEY missing' });
    }

    // Initialize API clients (must be done inside handler on Vercel)
    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    const openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });

    console.log('✓ API clients initialized');

    // 2. Parse JSON body
    console.log('Parsing request body...');
    const { audio, filename } = req.body;

    if (!audio || typeof audio !== 'string') {
      console.error('No audio data in request body');
      return res.status(400).json({ error: 'No audio data provided' });
    }

    console.log(`Filename: ${filename}`);
    console.log(`Base64 length: ${audio.length} chars`);

    // Decode base64 to buffer
    console.log('Decoding base64...');
    const audioBuffer = Buffer.from(audio, 'base64');

    // Check file size (25MB limit)
    if (audioBuffer.length > 25 * 1024 * 1024) {
      console.error(`File too large: ${audioBuffer.length} bytes`);
      return res.status(400).json({ error: 'File too large. Maximum 25MB allowed.' });
    }

    console.log(`✓ Decoded to buffer: ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`);

    // 3. Transcribe audio con Groq Whisper
    console.log('Creating audio stream for Groq...');
    const audioFile = bufferToFile(audioBuffer, filename || 'audio.mp3');
    console.log('Calling Groq Whisper API...');

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language: 'it', // Forza italiano
      response_format: 'text',
    });

    console.log(`✓ Transcription completed: ${transcription.length} chars`);
    console.log(`Preview: ${transcription.substring(0, 100)}...`);

    // 4. Extract workflows con OpenRouter + Gemini Flash (with fallback)
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
        error: "L'AI non ha prodotto un JSON valido. Riprova con un audio più chiaro.",
        details: `JSON parse error: ${parseError.message}`,
        rawResponse: extractedText.substring(0, 500), // First 500 chars for debugging
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

    const workflows = result.workflows.map((w: any, index: number) => ({
      ...w,
      id: `W${String(index + 1).padStart(3, '0')}`,
      tempoTotale: w.tempoMedio * w.frequenza,
    }));

    console.log(`✓ Created ${workflows.length} workflows`);
    console.log('=== PROCESS AUDIO SUCCESS ===');

    return res.status(200).json({
      success: true,
      transcription,
      workflows,
    });

  } catch (error: any) {
    console.error('=== PROCESS AUDIO ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Provide user-friendly error messages
    let userMessage = 'Error processing audio';
    let statusCode = 500;

    if (error.status === 429 || error.message?.includes('rate') || error.message?.includes('capacity')) {
      userMessage = 'OpenRouter è temporaneamente saturo. Riprova tra 5-10 minuti oppure carica un audio più breve.';
      statusCode = 503; // Service Unavailable
    } else if (error.message?.includes('transcription') || error.message?.includes('Groq')) {
      userMessage = 'Errore durante la trascrizione audio. Verifica che il file sia in formato MP3/M4A/WAV valido.';
    } else if (error.message?.includes('parse') || error.message?.includes('JSON')) {
      userMessage = "L'AI non è riuscita a estrarre workflow validi dal transcript. Prova con una registrazione più chiara.";
    }

    // Don't expose internal error details in production
    const response: any = {
      error: userMessage
    };

    // Only include details in development mode
    if (process.env.NODE_ENV === 'development') {
      response.details = error.message;
      response.type = error.constructor.name;
    }

    return res.status(statusCode).json(response);
  }
}

// Export handler with 50-second timeout (audio processing can take time)
export default withTimeout(handler, {
  timeoutMs: 50000, // 50 seconds for audio transcription + AI processing
  message: 'Audio processing took too long. Try with a shorter audio file.'
});
