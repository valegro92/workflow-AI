import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withTimeout } from './middleware/timeout.js';
import { withCSRF } from './middleware/csrf.js';
import { checkRateLimit, sendRateLimitError, addRateLimitHeaders } from './middleware/rateLimit.js';

/**
 * AI Chat Assistant Endpoint
 * POST /api/ai-chat
 *
 * Context-aware chat assistant per aiutare con:
 * - Compilazione workflow
 * - Suggerimenti AI strategy
 * - Spiegazioni framework AI Canvas
 * - Brainstorming ottimizzazioni
 *
 * Request body:
 * {
 *   "message": "User message",
 *   "context": {
 *     "currentWorkflow": { ... },
 *     "allWorkflows": [...],
 *     "currentStep": 1-4
 *   },
 *   "conversationHistory": [{ role: "user|assistant", content: "..." }]
 * }
 */

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  message: string;
  context?: {
    currentWorkflow?: any;
    allWorkflows?: any[];
    currentStep?: number;
    evaluations?: Record<string, any>;
    nomeAzienda?: string;
    costoOrario?: number;
  };
  conversationHistory?: ChatMessage[];
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const reqId = Math.random().toString(36).substring(2, 8);
  const log = (level: string, msg: string, data?: any) => {
    const ts = new Date().toISOString();
    const extra = data ? ` | ${JSON.stringify(data)}` : '';
    console.log(`[${ts}] [${reqId}] [CHAT] [${level}] ${msg}${extra}`);
  };

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  log('INFO', 'Request received', {
    origin: req.headers.origin || 'none',
    hasApiKey: !!req.headers['x-openrouter-key'],
    bodyKeys: req.body ? Object.keys(req.body) : [],
  });

  // Rate limiting - 20 requests per minute
  const rateLimit = checkRateLimit(req, {
    maxAttempts: 20,
    windowMs: 60 * 1000,
    keyPrefix: 'ai-chat:',
  });

  if (!rateLimit.allowed) {
    log('WARN', 'Rate limit exceeded');
    return sendRateLimitError(res, rateLimit.retryAfter || 60);
  }

  if (rateLimit.remaining !== undefined) {
    addRateLimitHeaders(res, rateLimit.remaining, 20);
  }

  const { message, context, conversationHistory = [] } = req.body as ChatRequest;

  if (!message || typeof message !== 'string') {
    log('WARN', 'Invalid message', { type: typeof message });
    return res.status(400).json({ error: 'Message is required' });
  }

  // User-provided OpenRouter key (required - no server fallback)
  const userOpenRouterKey = typeof req.headers['x-openrouter-key'] === 'string'
    ? req.headers['x-openrouter-key']
    : undefined;

  if (!userOpenRouterKey) {
    log('WARN', 'No API key provided');
    return res.status(400).json({
      error: 'NO_API_KEY',
      message: 'Per usare la chat AI, inserisci la tua chiave OpenRouter gratuita nelle impostazioni.'
    });
  }

  try {
    log('INFO', 'Processing', {
      msgLength: message.length,
      historyLength: conversationHistory.length,
      currentStep: context?.currentStep,
      keyPrefix: userOpenRouterKey.substring(0, 8),
    });

    // Costruisci system prompt context-aware
    const systemPrompt = buildSystemPrompt(context);

    // Costruisci la conversazione completa
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: message },
    ];

    // Chiama OpenRouter con fallback chain di modelli gratuiti
    const response = await callOpenRouterAPI(messages, userOpenRouterKey, log);

    log('INFO', 'SUCCESS', { responseLength: response.length });

    return res.status(200).json({
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    log('ERROR', 'FAILED', {
      errorType: error.constructor?.name,
      status: error.status,
      message: error.message?.substring(0, 300),
    });

    let userMessage = 'Errore AI Chat.';
    let statusCode = 500;

    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      userMessage = 'Chiave OpenRouter non valida. Verificala nelle impostazioni.';
      statusCode = 401;
    } else if (error.message?.includes('429') || error.message?.includes('rate') || error.message?.includes('capacity')) {
      userMessage = 'AI temporaneamente non disponibile. Riprova tra qualche minuto.';
      statusCode = 503;
    }

    return res.status(statusCode).json({
      error: userMessage,
      details: error.message?.substring(0, 200) || 'No details',
    });
  }
}

/**
 * Costruisce system prompt context-aware con conoscenza completa dell'app
 */
function buildSystemPrompt(context?: ChatRequest['context']): string {
  let prompt = `Sei l'assistente AI integrato nell'applicazione "Workflow AI Analyzer", basata sul framework "AI Collaboration Canvas" di Nicola Mattina.

## COME FUNZIONA L'APPLICAZIONE (spiegalo all'utente se chiede)

L'app guida l'utente in 4 step:

**Step 1 - Panoramica/Dashboard**: Mostra i workflow creati, le statistiche, il costo orario, il nome azienda. Da qui si parte.

**Step 2 - Mappatura Workflow**: L'utente descrive i processi aziendali compilando un form con:
- Fase (es. Analisi, Produzione, Controllo)
- Titolo e Descrizione dettagliata del processo
- Tool usati, Input necessari, Output prodotti
- Tempo medio (minuti per volta) e Frequenza mensile → il sistema calcola il Tempo Totale
- Pain points, Owner, flag PII/HITL/Citazioni
- C'è anche un'opzione "Compila con AI" che estrae automaticamente i campi da una descrizione libera (testo o voce)

**Step 3 - Valutazione**: Per ogni workflow, l'utente risponde a 8 domande (scala 0-1-2):
- 4 domande AUTOMAZIONE (quanto è ripetibile, regole chiare, dati strutturati, feedback semplice) → Score 0-8
- 4 domande CARICO COGNITIVO (creatività, giudizio soggettivo, contesto complesso, eccezioni) → Score 0-8
- Poi imposta la Complessità di implementazione (1-5)

**Le 4 strategie AI** (matrice 2×2):
- **AI Partner** (Auto BASSO + Cognitivo ALTO): Attività creative/strategiche → AI collabora come copilota
- **AI Assistant** (Auto ALTO + Cognitivo ALTO): Attività complesse ma strutturate → AI fa il grosso, umano supervisiona
- **Tool Automation** (Auto ALTO + Cognitivo BASSO): Processi ripetitivi → automazione completa con AI
- **Mantieni Umano** (Auto BASSO + Cognitivo BASSO): Non conviene automatizzare → resta manuale

**Step 4 - Risultati**: Canvas 2×2 con tutti i workflow posizionati, diagrammi BPMN, piano di implementazione AI (30/60/90 giorni), calcolo ROI, export PDF.

## IL TUO RUOLO

Sei un assistente in tempo reale che:
1. **Aiuta a compilare**: suggerisce come descrivere i workflow, quali campi riempire, come stimare tempi
2. **Spiega il framework**: cosa significano le domande di valutazione, come funziona la matrice 2×2
3. **Guida la navigazione**: dice all'utente cosa fare dopo, dove cliccare
4. **Dà consigli strategici**: suggerisce strategie AI, identifica quick wins, segnala processi ad alto potenziale
5. **Risponde a qualsiasi domanda** sull'app e sul framework

## REGOLE
- Rispondi SEMPRE in italiano
- Sii conciso (max 4-5 frasi) ma completo
- Se l'utente è in uno step specifico, dai consigli contestuali per quello step
- Usa riferimenti concreti ai workflow dell'utente quando possibile
`;

  // Contesto step corrente
  if (context?.currentStep) {
    const stepHelp: Record<number, string> = {
      1: 'L\'utente è nella Dashboard (Step 1). Può vedere i workflow creati, impostare il costo orario, o iniziare a mappare processi.',
      2: 'L\'utente sta mappando i workflow (Step 2). Aiutalo a compilare il form: fase, titolo, descrizione, tool, tempi, frequenza. Ricordagli che può usare "Compila con AI" per velocizzare.',
      3: 'L\'utente sta valutando i workflow (Step 3). Aiutalo a rispondere alle 8 domande. Spiega cosa significano i punteggi e le strategie.',
      4: 'L\'utente è nei Risultati (Step 4). Può vedere il canvas 2×2, generare diagrammi BPMN, creare il piano di implementazione, calcolare il ROI.',
    };
    prompt += `\n## CONTESTO ATTUALE\n${stepHelp[context.currentStep] || ''}\n`;
  }

  // Dettagli workflow corrente
  if (context?.currentWorkflow) {
    const wf = context.currentWorkflow;
    prompt += `\nWorkflow in focus:\n- ID: ${wf.id} | Titolo: ${wf.titolo || '(vuoto)'}\n- Descrizione: ${wf.descrizione || '(vuota)'}\n- Tool: ${wf.tool?.join(', ') || 'nessuno'}\n- Tempo: ${wf.tempoMedio || '?'}min × ${wf.frequenza || '?'}/mese = ${wf.tempoTotale || '?'}min/mese\n- Pain points: ${wf.painPoints || 'nessuno'}\n`;
  }

  // Tutti i workflow dell'utente
  if (context?.allWorkflows && context.allWorkflows.length > 0) {
    prompt += `\nWorkflow dell'utente (${context.allWorkflows.length} totali):\n`;
    for (const wf of context.allWorkflows) {
      prompt += `- ${wf.id}: "${wf.titolo}" (${wf.fase}) — ${wf.tempoTotale || 0}min/mese`;
      if (wf.evaluation) prompt += ` → Strategia: ${wf.evaluation.strategy?.name || '?'}`;
      prompt += `\n`;
    }
  }

  // Evaluations se disponibili
  if (context?.evaluations) {
    const evalEntries = Object.entries(context.evaluations);
    if (evalEntries.length > 0) {
      prompt += `\nValutazioni completate:\n`;
      for (const [wId, ev] of evalEntries) {
        const e = ev as any;
        prompt += `- ${wId}: Auto=${e.autoScore}/8, Cognitivo=${e.cogScore}/8 → ${e.strategy?.name || e.strategy || '?'} (Complessità: ${e.complessita}/5, Priorità: ${e.priorita?.toFixed(1) || '?'})\n`;
      }
    }
  }

  return prompt;
}

/**
 * Chiama OpenRouter API (user key only - no server key)
 */
type LogFn = (level: string, msg: string, data?: any) => void;

async function callOpenRouterAPI(messages: ChatMessage[], userKey: string, log: LogFn): Promise<string> {
  // 10-model fallback chain (all free on OpenRouter, Mar 2026, ordered by capability)
  const models = [
    'qwen/qwen3-235b-a22b:free',
    'deepseek/deepseek-r1:free',
    'meta-llama/llama-4-maverick:free',
    'nvidia/nemotron-3-super:free',
    'deepseek/deepseek-chat-v3.1:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen3-32b:free',
    'mistralai/mistral-small-3.1-24b-instruct:free',
    'google/gemma-3-27b-it:free',
    'arcee-ai/trinity-large-preview:free',
  ];

  for (let i = 0; i < models.length; i++) {
    try {
      log('INFO', `Trying model ${i + 1}/${models.length}: ${models[i]}`);
      const t0 = Date.now();

      // Per-model timeout: 8s per model to avoid consuming the entire budget
      const controller = new AbortController();
      const modelTimeout = setTimeout(() => controller.abort(), 8000);

      let response: Response;
      try {
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userKey}`,
            'HTTP-Referer': 'https://workflow-ai-eight.vercel.app',
            'X-Title': 'Workflow AI Analyzer - Chat Assistant',
          },
          body: JSON.stringify({
            model: models[i],
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            temperature: 0.7,
            max_tokens: 500,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(modelTimeout);
      }

      if (!response.ok) {
        const errorBody = await response.text();
        log('WARN', `Model HTTP error`, { model: models[i], status: response.status, body: errorBody.substring(0, 200) });
        throw new Error(`OpenRouter API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      let content = data.choices[0]?.message?.content;
      if (content) {
        const hadThinkTags = content.includes('<think>');
        content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        log('INFO', `Model succeeded`, {
          model: models[i],
          elapsed: `${Date.now() - t0}ms`,
          contentLength: content.length,
          hadThinkTags,
        });
        return content;
      }
      throw new Error('Empty response from model');
    } catch (err: any) {
      log('WARN', `Model failed`, { model: models[i], error: err.message?.substring(0, 200) });
      if (i === models.length - 1) throw err;
    }
  }

  return 'Nessuna risposta disponibile.';
}

// Export handler with CSRF protection and timeout
export default withCSRF(
  withTimeout(handler, {
    timeoutMs: 25000,
    message: 'AI Chat request timed out.',
  })
);
