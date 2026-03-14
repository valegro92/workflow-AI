import React from 'react';

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Top accent bar */}
      <div className="h-1 bg-brand" />

      {/* Nav */}
      <header className="bg-dark-card/80 backdrop-blur border-b border-brand/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <svg className="w-7 h-7 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            <span className="text-lg font-bold text-white">La Cassetta degli AI-trezzi</span>
          </div>
          <button
            onClick={onEnter}
            className="bg-brand text-dark-bg hover:bg-brand-light px-5 py-2 rounded-lg font-semibold transition-all text-sm"
          >
            Inizia
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-brand/10" />
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-28 text-center relative">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-brand/15 rounded-2xl flex items-center justify-center border border-brand/30">
              <svg className="w-10 h-10 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Scopri dove l'AI puo{' '}
            <span className="text-brand">trasformare</span> i tuoi processi
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-3 max-w-3xl mx-auto">
            Mappa i workflow della tua azienda, valutali con 8 criteri scientifici
            e ottieni un piano di implementazione AI con priorita e ROI.
          </p>
          <p className="text-sm text-brand-light mb-8">
            Workflow AI Analyzer &mdash; La Cassetta degli AI-trezzi
          </p>
          <button
            onClick={onEnter}
            className="bg-brand text-dark-bg hover:bg-brand-light px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-brand/20 hover:shadow-brand/40"
          >
            Inizia l'Analisi Gratuita
          </button>
          <p className="mt-4 text-xs text-gray-500">Nessuna registrazione richiesta. I dati restano nel tuo browser.</p>
        </div>
      </section>

      {/* Come funziona */}
      <section className="bg-dark-card/50 border-y border-dark-border py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Come funziona in <span className="text-brand">4 passi</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '1',
                title: 'Mappa',
                desc: 'Inserisci i tuoi workflow lavorativi: attivita, tempi, strumenti, frequenza e pain points.',
                icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
              },
              {
                step: '2',
                title: 'Valuta',
                desc: 'Rispondi a 8 domande per ogni workflow: 4 su automazione, 4 su carico cognitivo.',
                icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
              },
              {
                step: '3',
                title: 'Strategia',
                desc: 'L\'algoritmo classifica ogni processo nella matrice 2x2: Assistente AI, Tool, Brainstorming o Manuale.',
                icon: 'M13 10V3L4 14h7v7l9-11h-7z',
              },
              {
                step: '4',
                title: 'Piano AI',
                desc: 'Ottieni un piano con priorita, ROI calcolato, raccomandazioni per strategia e export PDF.',
                icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
              },
            ].map((item, i) => (
              <div key={i} className="bg-dark-card border border-dark-border rounded-xl p-6 text-center relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-dark-bg w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
                  {item.step}
                </div>
                <div className="w-12 h-12 mx-auto bg-brand/10 rounded-full flex items-center justify-center mb-4 mt-2">
                  <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Funzionalita */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Tutto quello che ti serve
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '📦', title: '40+ Template pronti', desc: 'Template pre-configurati per HR, Marketing, Sales, Finance, IT, Legal, Product, Data e Operations.' },
              { icon: '🧮', title: 'Valutazione 8 criteri', desc: '4 criteri di automazione + 4 di carico cognitivo per una classificazione oggettiva e ripetibile.' },
              { icon: '📊', title: 'Matrice strategica 2x2', desc: 'Visualizza ogni workflow su una mappa: Assistente AI, Strumento, Brainstorming o Manuale.' },
              { icon: '💰', title: 'ROI calcolato', desc: 'Inserisci il costo orario e ottieni risparmio mensile e ROI per ogni workflow automatizzabile.' },
              { icon: '📄', title: 'Export PDF completo', desc: 'Report professionale con executive summary, tabella priorita, matrice visuale e raccomandazioni.' },
              { icon: '🤖', title: 'AI Chat integrata', desc: 'Assistente AI per aiutarti nella mappatura, nella valutazione e nella generazione del piano.' },
            ].map((feature, i) => (
              <div key={i} className="bg-dark-card border border-dark-border rounded-xl p-6 hover:border-brand/40 transition-colors">
                <span className="text-3xl mb-3 block">{feature.icon}</span>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Per chi e */}
      <section className="bg-dark-card/50 border-y border-dark-border py-16">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Per chi e?</h2>
          <p className="text-gray-400 mb-10 max-w-2xl mx-auto">
            Per chiunque voglia capire dove e come introdurre l'AI nei propri processi lavorativi.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { role: 'Operations Manager', desc: 'Ottimizza processi e riduci sprechi' },
              { role: 'HR Director', desc: 'Automatizza onboarding e admin' },
              { role: 'Consulente', desc: 'Analisi AI-readiness per i clienti' },
              { role: 'IT Lead', desc: 'Prioritizza le integrazioni AI' },
            ].map((persona, i) => (
              <div key={i} className="bg-dark-card border border-dark-border rounded-lg p-5">
                <p className="font-bold text-brand text-sm mb-1">{persona.role}</p>
                <p className="text-xs text-gray-400">{persona.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA finale */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto a scoprire il potenziale AI della tua azienda?
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            Inizia gratuitamente. I tuoi dati restano nel browser, nessun account richiesto.
          </p>
          <button
            onClick={onEnter}
            className="bg-brand text-dark-bg hover:bg-brand-light px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-brand/20 hover:shadow-brand/40"
          >
            Inizia l'Analisi
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-card border-t border-dark-border py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400 mb-2">
            <span className="font-bold text-white">La Cassetta degli AI-trezzi</span> &mdash; Workflow AI Analyzer
          </p>
          <p className="text-xs text-gray-500">
            Powered by{' '}
            <a
              href="https://www.linkedin.com/in/valentino-grossi/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:text-brand-light hover:underline font-medium"
            >
              Valentino Grossi
            </a>
            {' | '}
            <a
              href="https://valentinogrossi.it"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-300 hover:underline"
            >
              valentinogrossi.it
            </a>
          </p>
        </div>
      </footer>

      {/* Bottom accent bar */}
      <div className="h-1 bg-brand" />
    </div>
  );
};
