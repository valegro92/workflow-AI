import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { withTimeout } from './middleware/timeout';

// OpenRouter client
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

// Prompt per Piano Implementazione (DeepSeek-R1)
const IMPLEMENTATION_PLAN_PROMPT = `Sei un esperto consulente di trasformazione digitale e AI.

Analizza questi workflow valutati e crea un piano di implementazione dettagliato e pratico.

OBIETTIVO: Fornire una roadmap chiara 30/60/90 giorni con priorità, quick wins, e azioni concrete.

FORMATO OUTPUT:
Rispondi in markdown formattato in italiano, con questa struttura:

## 📊 Analisi Overview
- Workflow totali analizzati: X
- Risparmio mensile totale: X minuti (€Y se disponibile)
- Distribuzione strategie: X assistente AI, Y strumenti, Z brainstorming, W manuale

## 🎯 Quick Wins (0-30 giorni)
Elenca i 2-3 workflow con:
- **[ID] Nome Workflow** (Priorità: X.X)
  - ✅ Perché è un quick win: [spiegazione basata su bassa complessità + alto impatto]
  - 🛠️ Azione concreta: [step specifici per implementare]
  - ⏱️ Tempo stimato: X ore
  - 💰 ROI atteso: X€/mese (se costo orario disponibile)

## 🚀 Medium Term (30-60 giorni)
Workflow che richiedono più preparazione:
- **[ID] Nome Workflow** (Priorità: X.X)
  - 📋 Prerequisiti: [cosa serve prima]
  - 🛠️ Piano: [step implementazione]
  - ⚠️ Rischi: [cosa potrebbe andare storto]

## 🎓 Long Term (60-90 giorni)
Workflow complessi o dipendenti da altri:
- **[ID] Nome Workflow**
  - 🔗 Dipendenze: [workflow da completare prima]
  - 📈 Valore strategico: [perché importante anche se complesso]

## ⚠️ Attenzioni Critiche
- Workflow con PII=true: [lista] → Richiede compliance GDPR
- Workflow con HITL=false ma alta criticità: [lista] → Aggiungi supervisione
- Strategie "Mantieni umano": [analisi se davvero non automatizzabili]

## 💡 Raccomandazioni Strategiche
- Pattern identificati: [analisi cross-workflow]
- Investimenti consigliati: [tool, training, etc.]
- Metriche di successo da tracciare

Sii SPECIFICO, PRATICO e ORIENTATO ALL'AZIONE. Evita genericità.`;

interface WorkflowData {
  id: string;
  titolo: string;
  fase: string;
  tempoTotale: number;
  tool: string[];
  pii: boolean;
  hitl: boolean;
  painPoints: string;
}

interface EvaluationData {
  strategy: {
    name: string;
    color: string;
  };
  complessita: number;
  priorita: number;
  autoScore: number;
  cogScore: number;
}

async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== AI SUGGESTIONS START ===');

    // Check API key
    if (!process.env.OPENROUTER_KEY) {
      console.error('OPENROUTER_KEY not configured');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const { type, workflows, evaluations, costoOrario } = req.body;

    if (!type || !workflows || !evaluations) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    console.log(`Request type: ${type}`);
    console.log(`Workflows: ${workflows.length}`);
    console.log(`Costo orario: ${costoOrario || 'N/A'}`);

    // Prepare data summary for AI
    const workflowSummary = workflows.map((w: WorkflowData, index: number) => {
      const evaluation: EvaluationData = evaluations[w.id];
      if (!evaluation) return null;

      const savings = costoOrario ? ((w.tempoTotale / 60) * costoOrario).toFixed(0) : null;

      return `
**Workflow ${w.id}: ${w.titolo}**
- Fase: ${w.fase}
- Tempo totale: ${w.tempoTotale} min/mese ${savings ? `(€${savings}/mese risparmio)` : ''}
- Tool attuali: ${w.tool.join(', ') || 'N/A'}
- Strategia AI: ${evaluation.strategy.name}
- Score: Automazione ${evaluation.autoScore}/8, Carico Cognitivo ${evaluation.cogScore}/8
- Complessità implementazione: ${evaluation.complessita}/5
- Priorità: ${evaluation.priorita.toFixed(1)}
- PII: ${w.pii ? 'Sì' : 'No'}, HITL: ${w.hitl ? 'Sì' : 'No'}
${w.painPoints ? `- Pain points: ${w.painPoints}` : ''}
`.trim();
    }).filter(Boolean).join('\n\n');

    const totalTime = workflows.reduce((sum: number, w: WorkflowData) => sum + w.tempoTotale, 0);
    const totalSavings = costoOrario ? ((totalTime / 60) * costoOrario).toFixed(0) : null;

    const contextData = `
CONTESTO GENERALE:
- Workflow totali: ${workflows.length}
- Tempo mensile totale: ${totalTime} minuti
${totalSavings ? `- Risparmio potenziale: €${totalSavings}/mese (costo orario: €${costoOrario}/ora)` : ''}

WORKFLOW DETTAGLIATI (ordinati per priorità decrescente):
${workflowSummary}
`.trim();

    // Call AI based on type
    let primaryModel = '';
    let fallbackModel = '';
    let prompt = '';

    if (type === 'implementation-plan') {
      primaryModel = 'deepseek/deepseek-r1:free';
      fallbackModel = 'meta-llama/llama-3.3-70b-instruct:free';
      prompt = IMPLEMENTATION_PLAN_PROMPT + '\n\n' + contextData;
    } else {
      return res.status(400).json({ error: 'Unknown suggestion type' });
    }

    console.log(`Calling OpenRouter with model: ${primaryModel}`);

    let completion;
    let modelUsed = primaryModel;

    try {
      completion = await openrouter.chat.completions.create({
        model: primaryModel,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      });
    } catch (primaryError: any) {
      // If rate limited (429) or capacity issue, try fallback model
      if (primaryError.status === 429 || primaryError.message?.includes('rate') || primaryError.message?.includes('capacity')) {
        console.log(`Primary model saturated (429), trying fallback: ${fallbackModel}`);
        modelUsed = fallbackModel;

        completion = await openrouter.chat.completions.create({
          model: fallbackModel,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
        });
      } else {
        // Re-throw if not a rate limit error
        throw primaryError;
      }
    }

    const suggestion = completion.choices[0]?.message?.content || '';

    console.log(`✓ AI suggestion completed with ${modelUsed}: ${suggestion.length} chars`);
    console.log('=== AI SUGGESTIONS SUCCESS ===');

    return res.status(200).json({
      success: true,
      suggestion,
      model: modelUsed,
    });

  } catch (error: any) {
    console.error('=== AI SUGGESTIONS ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);

    // Provide user-friendly error messages
    let userMessage = 'Error generating AI suggestions';
    let statusCode = 500;

    if (error.status === 429 || error.message?.includes('rate') || error.message?.includes('capacity')) {
      userMessage = 'OpenRouter è temporaneamente saturo. Riprova tra 5-10 minuti.';
      statusCode = 503; // Service Unavailable
    } else if (error.message?.includes('API key') || error.message?.includes('credentials')) {
      userMessage = 'Configurazione API non valida. Verifica le chiavi API su Vercel.';
    }

    // Don't expose internal error details in production
    const response: any = {
      error: userMessage
    };

    // Only include details in development mode
    if (process.env.NODE_ENV === 'development') {
      response.details = error.message;
    }

    return res.status(statusCode).json(response);
  }
}

// Export handler with 30-second timeout (AI generation can take time)
export default withTimeout(handler, {
  timeoutMs: 30000, // 30 seconds for AI suggestion generation
  message: 'AI suggestion generation took too long. Try again with fewer workflows.'
});
