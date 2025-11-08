import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

// OpenRouter client
const openrouter = new OpenAI({
  apiKey: process.env.OPENTOUTER_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== AI WORKFLOW EXTRACT START ===');

    // Check API key
    if (!process.env.OPENTOUTER_KEY) {
      console.error('OPENTOUTER_KEY not configured');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const { description } = req.body;

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters' });
    }

    console.log(`Description length: ${description.length} chars`);

    // Use Gemini 2.0 Flash (fast + free)
    const model = 'google/gemini-2.0-flash-exp:free';

    console.log(`Calling OpenRouter with model: ${model}`);

    const completion = await openrouter.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: WORKFLOW_EXTRACTION_PROMPT,
        },
        {
          role: 'user',
          content: `DESCRIZIONE WORKFLOW:\n\n${description}`,
        },
      ],
      temperature: 0.3, // Low temperature for consistent extraction
    });

    const responseText = completion.choices[0]?.message?.content || '';

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
      console.error('Raw response:', responseText);
      return res.status(500).json({
        error: 'Failed to parse AI response',
        details: parseError.message,
        raw: responseText
      });
    }

    // Validate required fields
    const required = ['fase', 'titolo', 'descrizione', 'tool', 'input', 'output', 'tempoMedio', 'frequenza'];
    const missing = required.filter(field => !(field in extractedData));

    if (missing.length > 0) {
      console.error('Missing required fields:', missing);
      return res.status(500).json({
        error: 'Incomplete extraction',
        missing,
        extracted: extractedData
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

    let userMessage = 'Error extracting workflow data';
    let statusCode = 500;

    if (error.status === 429 || error.message?.includes('rate') || error.message?.includes('capacity')) {
      userMessage = 'AI service temporarily unavailable. Please try again.';
      statusCode = 503;
    }

    return res.status(statusCode).json({
      error: userMessage,
      details: error.message,
    });
  }
}
