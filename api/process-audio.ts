import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import formidable from 'formidable';
import fs from 'fs';

// Groq client per Whisper
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// OpenRouter client per LLM
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

// Disable bodyParser per gestire multipart
export const config = {
  api: {
    bodyParser: false,
  },
};

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
    // 1. Parse multipart form data
    const form = formidable({
      maxFileSize: 25 * 1024 * 1024, // 25MB limit
      keepExtensions: true
    });

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>(
      (resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          else resolve([fields, files]);
        });
      }
    );

    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;

    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // 2. Transcribe audio con Groq Whisper
    console.log('Transcribing audio with Groq Whisper...');

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(audioFile.filepath),
      model: 'whisper-large-v3-turbo',
      language: 'it', // Forza italiano
      response_format: 'text',
    });

    console.log('Transcription completed:', transcription.substring(0, 200) + '...');

    // 3. Extract workflows con OpenRouter + Gemini Flash
    console.log('Extracting workflows with OpenRouter...');

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
    console.log('Extraction completed:', extractedText.substring(0, 200) + '...');

    const result = JSON.parse(extractedText);

    // 4. Aggiungi IDs ai workflows
    const workflows = (result.workflows || []).map((w: any, index: number) => ({
      ...w,
      id: `W${String(index + 1).padStart(3, '0')}`,
      tempoTotale: w.tempoMedio * w.frequenza,
    }));

    return res.status(200).json({
      success: true,
      transcription,
      workflows,
    });

  } catch (error: any) {
    console.error('Error processing audio:', error);
    return res.status(500).json({
      error: 'Error processing audio',
      details: error.message,
    });
  }
}
