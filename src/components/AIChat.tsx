import React, { useState, useRef, useEffect } from 'react';
import { Workflow } from '../types';
import OpenRouterKeySetup from './OpenRouterKeySetup';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  currentWorkflow?: Workflow;
  allWorkflows?: Workflow[];
  currentStep?: number;
}

export default function AIChat({ currentWorkflow, allWorkflows, currentStep }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Ciao! Sono il tuo assistente AI per il framework AI Collaboration Canvas. Posso aiutarti a compilare i workflow, spiegarti il framework, o suggerire strategie AI. Come posso aiutarti?',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getOpenRouterKey = (): string | null => {
    try {
      const saved = localStorage.getItem('ai-collaboration-canvas-data');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.openRouterKey || null;
      }
    } catch {}
    return null;
  };

  const hasKey = () => !!getOpenRouterKey();

  const handleOpenChat = () => {
    if (!hasKey()) {
      setShowKeySetup(true);
    } else {
      setIsOpen(true);
    }
  };

  const handleKeySaved = (key: string) => {
    try {
      const saved = localStorage.getItem('ai-collaboration-canvas-data');
      const data = saved ? JSON.parse(saved) : {};
      data.openRouterKey = key;
      localStorage.setItem('ai-collaboration-canvas-data', JSON.stringify(data));
    } catch {}
    setShowKeySetup(false);
    setIsOpen(true);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const saved = localStorage.getItem('ai-chat-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch (e) {
        console.error('Error loading chat history:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem('ai-chat-history', JSON.stringify(messages));
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Check for key before sending
    if (!hasKey()) {
      setShowKeySetup(true);
      return;
    }

    const userMessage: Message = { role: 'user', content: inputMessage, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const context = { currentWorkflow, allWorkflows, currentStep };
      const conversationHistory = messages.map((m) => ({ role: m.role, content: m.content }));

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const openRouterKey = getOpenRouterKey();
      if (openRouterKey) {
        headers['X-OpenRouter-Key'] = openRouterKey;
      }

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: inputMessage, context, conversationHistory }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.error === 'NO_API_KEY') {
          throw new Error('NO_API_KEY');
        }
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response, timestamp: new Date() }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMsg = error.message === 'NO_API_KEY'
        ? '🔑 Per usare la chat AI, configura la tua chiave OpenRouter gratuita nelle impostazioni (Step 4 → Impostazioni). Vai su openrouter.ai, crea un account gratis e genera una chiave.'
        : 'Mi dispiace, si è verificato un errore. Riprova tra poco.';
      setMessages((prev) => [...prev, { role: 'assistant', content: errorMsg, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    if (confirm('Vuoi cancellare tutta la conversazione?')) {
      setMessages([{ role: 'assistant', content: 'Chat resettata! Come posso aiutarti?', timestamp: new Date() }]);
      localStorage.removeItem('ai-chat-history');
    }
  };

  const quickQuestions = [
    'Come funziona il framework AI Canvas?',
    'Come compilo un workflow?',
    'Quali sono le 4 strategie AI?',
  ];

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
    inputRef.current?.focus();
  };

  return (
    <>
      {/* OpenRouter Key Setup Modal */}
      {showKeySetup && (
        <OpenRouterKeySetup
          onKeySaved={handleKeySaved}
          onCancel={() => setShowKeySetup(false)}
        />
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={handleOpenChat}
          className="fixed bottom-6 right-6 bg-brand hover:bg-brand-light text-dark-bg rounded-full p-4 shadow-lg hover:shadow-xl transition-all z-40 flex items-center gap-2 group"
          aria-label="Apri AI Chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-semibold">
            AI Assistant
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-dark-card rounded-lg shadow-2xl flex flex-col z-50 border border-dark-border">
          {/* Header */}
          <div className="bg-dark-hover border-b border-brand/30 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-sm">AI Assistant</h3>
                <p className="text-xs text-gray-400">Sempre qui per aiutarti</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={clearChat} className="text-gray-400 hover:text-white rounded p-1 transition-colors text-sm" title="Cancella chat">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white rounded p-1 transition-colors text-xl" aria-label="Chiudi">
                ×
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-bg">
            {messages.map((message, idx) => (
              <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-brand text-dark-bg'
                    : 'bg-dark-card text-gray-200 border border-dark-border'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-dark-bg/60' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-dark-card text-brand border border-dark-border rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length <= 2 && !isLoading && (
            <div className="px-4 py-2 bg-dark-card border-t border-dark-border">
              <p className="text-xs text-gray-500 mb-2">Domande rapide:</p>
              <div className="flex flex-wrap gap-1">
                {quickQuestions.map((question, idx) => (
                  <button key={idx} onClick={() => handleQuickQuestion(question)}
                    className="text-xs bg-dark-hover border border-dark-border text-gray-300 px-2 py-1 rounded hover:border-brand hover:text-brand transition-colors">
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-dark-border bg-dark-card rounded-b-lg">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Scrivi un messaggio..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 bg-dark-hover border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed text-sm placeholder-gray-500"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-brand text-dark-bg px-4 py-2 rounded-lg hover:bg-brand-light disabled:bg-dark-hover disabled:text-gray-500 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {isLoading ? '...' : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Premi Invio per inviare
              {currentWorkflow && ' • Sto guardando il workflow corrente'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
