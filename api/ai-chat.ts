import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withTimeout } from './middleware/timeout';
import { withCSRF } from './middleware/csrf';
import { checkRateLimit, sendRateLimitError, addRateLimitHeaders } from './middleware/rateLimit';

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
 * Costruisce system prompt context-aware
 */
function buildSystemPrompt(context?: ChatRequest['context']): string {
  let prompt = `Sei un assistente AI esperto in:
- Framework "AI Collaboration Canvas" di Nicola Mattina
- Analisi e mappatura processi aziendali
- Strategie di adozione AI in azienda
- Valutazione automazione e cognitive load

Il tuo compito è aiutare l'utente a:
1. Compilare correttamente i workflow
2. Capire come funziona il framework
3. Identificare opportunità di automazione AI
4. Rispondere a domande su strategie AI

Rispondi in modo:
- Conciso e pratico (max 3-4 frasi)
- Specifico al contesto dell'utente
- Con esempi concreti quando utile
- In italiano

`;

  // Aggiungi contesto specifico se disponibile
  if (context?.currentStep) {
    const stepNames = {
      1: 'Dashboard',
      2: 'Mappatura Workflow',
      3: 'Valutazione Workflow',
      4: 'Risultati e Strategie AI',
    };
    prompt += `\nL'utente è nello step: ${context.currentStep} - ${stepNames[context.currentStep as keyof typeof stepNames]}\n`;
  }

  if (context?.currentWorkflow) {
    const wf = context.currentWorkflow;
    prompt += `\nWorkflow corrente in editing:
- Titolo: ${wf.titolo || 'Non compilato'}
- Descrizione: ${wf.descrizione || 'Non compilata'}
- Tool: ${wf.tool?.join(', ') || 'Nessuno'}
- Tempo medio: ${wf.tempoMedio || 'Non specificato'} min
- Frequenza: ${wf.frequenza || 'Non specificata'} volte/mese
`;
  }

  if (context?.allWorkflows && context.allWorkflows.length > 0) {
    prompt += `\nL'utente ha ${context.allWorkflows.length} workflow già mappati.\n`;
  }

  prompt += `\nRicorda: risposte brevi, pratiche e contestualizzate.`;

  return prompt;
}

/**
 * Chiama OpenRouter API (user key only - no server key)
 */
type LogFn = (level: string, msg: string, data?: any) => void;

async function callOpenRouterAPI(messages: ChatMessage[], userKey: string, log: LogFn): Promise<string> {
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

  for (let i = 0; i < models.length; i++) {
    try {
      log('INFO', `Trying model ${i + 1}/${models.length}: ${models[i]}`);
      const t0 = Date.now();
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
      });

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
