import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { withTimeout } from './middleware/timeout.js';
import { withCSRF } from './middleware/csrf.js';
import { checkRateLimit, sendRateLimitError, addRateLimitHeaders } from './middleware/rateLimit.js';

// Initialize OpenAI client inside handler to avoid serverless memory leaks

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

  const reqId = Math.random().toString(36).substring(2, 8);
  const log = (level: string, msg: string, data?: any) => {
    const ts = new Date().toISOString();
    const extra = data ? ` | ${JSON.stringify(data)}` : '';
    console.log(`[${ts}] [${reqId}] [SUGGEST] [${level}] ${msg}${extra}`);
  };

  try {
    log('INFO', 'Request received', {
      method: req.method,
      origin: req.headers.origin || 'none',
      hasApiKey: !!req.headers['x-openrouter-key'],
      bodyKeys: req.body ? Object.keys(req.body) : [],
    });

    // Rate limiting - 5 requests per minute per IP (AI generation is resource intensive)
    const rateLimit = checkRateLimit(req, {
      maxAttempts: 5,
      windowMs: 60 * 1000, // 1 minute
      keyPrefix: 'ai-suggestions:',
    });

    if (!rateLimit.allowed) {
      log('WARN', 'Rate limit exceeded');
      return sendRateLimitError(res, rateLimit.retryAfter || 60);
    }

    if (rateLimit.remaining !== undefined) {
      addRateLimitHeaders(res, rateLimit.remaining, 5);
    }

    // User-provided key from header (required - no server fallback)
    const userKey = req.headers['x-openrouter-key'];
    const apiKey = typeof userKey === 'string' ? userKey : undefined;

    if (!apiKey) {
      log('WARN', 'No API key provided');
      return res.status(400).json({
        error: 'NO_API_KEY',
        message: 'Per usare le funzionalita AI, inserisci la tua chiave OpenRouter gratuita nelle impostazioni.'
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

    const { type, workflows, evaluations, costoOrario } = req.body;

    if (!type || !workflows || !evaluations) {
      log('WARN', 'Missing required data', { hasType: !!type, hasWorkflows: !!workflows, hasEvals: !!evaluations });
      return res.status(400).json({ error: 'Missing required data' });
    }

    log('INFO', 'Processing', {
      type,
      workflowCount: workflows.length,
      costoOrario: costoOrario || 'N/A',
      keyPrefix: apiKey.substring(0, 8),
    });

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
    let prompt = '';

    if (type === 'implementation-plan') {
      prompt = IMPLEMENTATION_PLAN_PROMPT + '\n\n' + contextData;
    } else {
      return res.status(400).json({ error: 'Unknown suggestion type' });
    }

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

    let completion;
    let modelUsed = '';

    for (let i = 0; i < models.length; i++) {
      try {
        log('INFO', `Trying model ${i + 1}/${models.length}: ${models[i]}`);
        const t0 = Date.now();
        completion = await openrouter.chat.completions.create({
          model: models[i],
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
        });
        modelUsed = models[i];
        log('INFO', `Model succeeded`, { model: modelUsed, elapsed: `${Date.now() - t0}ms` });
        break;
      } catch (err: any) {
        log('WARN', `Model failed`, {
          model: models[i],
          status: err.status,
          message: err.message?.substring(0, 200),
        });
        if (i === models.length - 1) throw err;
      }
    }

    // Strip thinking tags from models that use them (e.g., Qwen)
    const rawContent = completion!.choices[0]?.message?.content || '';
    const hadThinkTags = rawContent.includes('<think>');
    const suggestion = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    log('INFO', 'SUCCESS', { model: modelUsed, suggestionLength: suggestion.length, hadThinkTags });

    return res.status(200).json({
      success: true,
      suggestion,
      model: modelUsed,
    });

  } catch (error: any) {
    log('ERROR', 'FAILED', {
      errorType: error.constructor?.name,
      status: error.status,
      code: error.code,
      message: error.message?.substring(0, 300),
      stack: error.stack?.split('\n').slice(0, 3).join(' | '),
    });

    // Provide user-friendly error messages
    let userMessage = 'Error generating AI suggestions';
    let statusCode = 500;

    if (error.status === 429 || error.message?.includes('rate') || error.message?.includes('capacity')) {
      userMessage = 'OpenRouter è temporaneamente saturo. Riprova tra 5-10 minuti.';
      statusCode = 503;
    } else if (error.status === 401 || error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      userMessage = 'Chiave OpenRouter non valida. Verifica la chiave nelle impostazioni.';
      statusCode = 401;
    } else if (error.message?.includes('API key') || error.message?.includes('credentials')) {
      userMessage = 'Configurazione API non valida. Verifica le chiavi API.';
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
    timeoutMs: 30000, // 30 seconds for AI suggestion generation
    message: 'AI suggestion generation took too long. Try again with fewer workflows.'
  })
);
