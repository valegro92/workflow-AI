import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { Readable } from 'stream';

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

export default async function handler(
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
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY not configured');
      return res.status(500).json({ error: 'Server misconfiguration: OPENROUTER_API_KEY missing' });
    }

    // Initialize API clients (must be done inside handler on Vercel)
    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    const openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
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

    // 4. Extract workflows con OpenRouter + Gemini Flash
    console.log('Calling OpenRouter + Gemini Flash...');

    const completion = await openrouter.chat.completions.create({
      model: 'google/gemini-2.0-flash-exp:free',
      messages: [
        {
          role: 'user',
          content: EXTRACTION_PROMPT + '\n\n' + transcription,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const extractedText = completion.choices[0]?.message?.content || '{}';
    console.log(`✓ Extraction completed: ${extractedText.length} chars`);
    console.log(`Preview: ${extractedText.substring(0, 150)}...`);

    const result = JSON.parse(extractedText);

    // 5. Aggiungi IDs ai workflows
    const workflows = (result.workflows || []).map((w: any, index: number) => ({
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

    return res.status(500).json({
      error: 'Error processing audio',
      details: error.message,
      type: error.constructor.name,
    });
  }
}
