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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting - 20 requests per minute
  const rateLimit = checkRateLimit(req, {
    maxAttempts: 20,
    windowMs: 60 * 1000,
    keyPrefix: 'ai-chat:',
  });

  if (!rateLimit.allowed) {
    return sendRateLimitError(res, rateLimit.retryAfter || 60);
  }

  if (rateLimit.remaining !== undefined) {
    addRateLimitHeaders(res, rateLimit.remaining, 20);
  }

  const { message, context, conversationHistory = [] } = req.body as ChatRequest;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  // User-provided OpenRouter key (required - no server fallback)
  const userOpenRouterKey = typeof req.headers['x-openrouter-key'] === 'string'
    ? req.headers['x-openrouter-key']
    : undefined;

  if (!userOpenRouterKey) {
    return res.status(400).json({
      error: 'NO_API_KEY',
      message: 'Per usare la chat AI, inserisci la tua chiave OpenRouter gratuita nelle impostazioni.'
    });
  }

  try {
    // Costruisci system prompt context-aware
    const systemPrompt = buildSystemPrompt(context);

    // Costruisci la conversazione completa
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: message },
    ];

    // Chiama OpenRouter con modelli gratuiti
    const response = await callOpenRouterAPI(messages, userOpenRouterKey);

    return res.status(200).json({
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('AI Chat error:', error);

    // Fallback: retry with same user key
    try {
      const systemPrompt = buildSystemPrompt(context);
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10),
        { role: 'user', content: message },
      ];

      const response = await callOpenRouterAPI(messages, userOpenRouterKey);
      return res.status(200).json({
        response,
        timestamp: new Date().toISOString(),
        fallback: true,
      });
    } catch (fallbackError: any) {
      console.error('Fallback AI Chat error:', fallbackError);

      const response: any = { error: 'Errore AI Chat' };
      if (process.env.NODE_ENV === 'development') {
        response.details = fallbackError.message;
      }
      return res.status(500).json(response);
    }
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
async function callOpenRouterAPI(messages: ChatMessage[], userKey?: string): Promise<string> {
  if (!userKey) {
    throw new Error('Chiave OpenRouter non disponibile. Inserisci la tua chiave nelle impostazioni.');
  }
  const apiKey = userKey;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:5173',
      'X-Title': 'Workflow AI Analyzer - Chat Assistant',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free', // Gratuito
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'Nessuna risposta disponibile.';
}

// Export handler with CSRF protection and timeout
export default withCSRF(
  withTimeout(handler, {
    timeoutMs: 25000,
    message: 'AI Chat request timed out.',
  })
);
