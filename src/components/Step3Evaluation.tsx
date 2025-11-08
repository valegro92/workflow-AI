import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Evaluation } from '../types';
import {
  calculateAutomationScore,
  calculateCognitiveScore,
  calculateStrategy,
  calculatePriority
} from '../utils/businessLogic';
import { automationQuestions, cognitiveQuestions } from '../data/questions';

export const Step3Evaluation: React.FC = () => {
  const { state, addEvaluation, updateEvaluation, setCurrentStep } = useAppContext();

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [complessita, setComplessita] = useState<number>(3); // Default: media complessità

  useEffect(() => {
    // Auto-seleziona il primo workflow non valutato
    if (state.workflows.length > 0 && !selectedWorkflowId) {
      const firstUneval = state.workflows.find(w => !state.evaluations[w.id]);
      if (firstUneval) {
        setSelectedWorkflowId(firstUneval.id);
      } else {
        setSelectedWorkflowId(state.workflows[0].id);
      }
    }
  }, [state.workflows, selectedWorkflowId]);

  useEffect(() => {
    // Carica valutazione esistente quando si seleziona un workflow
    if (selectedWorkflowId && state.evaluations[selectedWorkflowId]) {
      const evaluation = state.evaluations[selectedWorkflowId];
      setAnswers({
        a1: evaluation.a1,
        a2: evaluation.a2,
        a3: evaluation.a3,
        a4: evaluation.a4,
        c1: evaluation.c1,
        c2: evaluation.c2,
        c3: evaluation.c3,
        c4: evaluation.c4
      });
      setComplessita(evaluation.complessita || 3);
    } else {
      setAnswers({});
      setComplessita(3);
    }
  }, [selectedWorkflowId, state.evaluations]);

  const selectedWorkflow = state.workflows.find(w => w.id === selectedWorkflowId);

  const handleAnswerChange = (key: string, value: number) => {
    setAnswers({ ...answers, [key]: value });
  };

  const allQuestionsAnswered = () => {
    const requiredKeys = ['a1', 'a2', 'a3', 'a4', 'c1', 'c2', 'c3', 'c4'];
    return requiredKeys.every(key => answers[key] !== undefined);
  };

  const autoScore = calculateAutomationScore(
    answers.a1 || 0,
    answers.a2 || 0,
    answers.a3 || 0,
    answers.a4 || 0
  );

  const cogScore = calculateCognitiveScore(
    answers.c1 || 0,
    answers.c2 || 0,
    answers.c3 || 0,
    answers.c4 || 0
  );

  const strategy = allQuestionsAnswered()
    ? calculateStrategy(autoScore, cogScore)
    : null;

  const handleSave = () => {
    if (!selectedWorkflowId || !allQuestionsAnswered()) {
      return;
    }

    const impatto = selectedWorkflow?.tempoTotale || 0;
    const priorita = calculatePriority(impatto, complessita);

    const evaluation: Evaluation = {
      workflowId: selectedWorkflowId,
      a1: answers.a1,
      a2: answers.a2,
      a3: answers.a3,
      a4: answers.a4,
      c1: answers.c1,
      c2: answers.c2,
      c3: answers.c3,
      c4: answers.c4,
      autoScore,
      cogScore,
      strategy: strategy!,
      impatto,
      complessita,
      priorita
    };

    if (state.evaluations[selectedWorkflowId]) {
      updateEvaluation(selectedWorkflowId, evaluation);
    } else {
      addEvaluation(evaluation);
    }

    // Passa al prossimo workflow non valutato
    const nextUneval = state.workflows.find(
      w => w.id !== selectedWorkflowId && !state.evaluations[w.id]
    );
    if (nextUneval) {
      setSelectedWorkflowId(nextUneval.id);
      setAnswers({});
      setComplessita(3);
    }
  };

  const evaluatedCount = Object.keys(state.evaluations).length;
  const totalCount = state.workflows.length;
  const allEvaluated = evaluatedCount === totalCount;

  if (state.workflows.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6">
          <p className="text-yellow-700">
            Devi prima creare almeno un workflow nella fase di mappatura.
          </p>
          <button
            onClick={() => setCurrentStep(2)}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
          >
            ← Torna alla Mappatura
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        🎯 Valutazione Step
      </h2>

      {/* Progress */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <p className="text-blue-700 font-semibold">
          Step {evaluatedCount} di {totalCount} completati{' '}
          {allEvaluated && '✓'}
        </p>
      </div>

      {/* Selector Step */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Seleziona Step da Valutare
        </label>
        <select
          value={selectedWorkflowId}
          onChange={(e) => setSelectedWorkflowId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {state.workflows.map((workflow) => (
            <option key={workflow.id} value={workflow.id}>
              {workflow.id} - {workflow.titolo}{' '}
              {state.evaluations[workflow.id] ? '✓' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Card Info Step Corrente */}
      {selectedWorkflow && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="inline-block bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold mr-2">
                {selectedWorkflow.id}
              </span>
              <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                {selectedWorkflow.fase}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Tempo totale</p>
              <p className="text-lg font-bold text-blue-600">
                {selectedWorkflow.tempoTotale} min/mese
              </p>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {selectedWorkflow.titolo}
          </h3>
          <p className="text-gray-700">{selectedWorkflow.descrizione}</p>
        </div>
      )}

      {/* Sezione AUTOMAZIONE */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6" style={{ backgroundColor: '#e2efda' }}>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          🟢 AUTOMAZIONE - Quanto è ripetibile?
        </h3>

        <div className="space-y-6">
          {automationQuestions.map((q) => (
            <div key={q.key}>
              <p className="font-semibold text-gray-800 mb-3">{q.question}</p>
              <div className="flex gap-4">
                {q.options.map((option) => (
                  <label
                    key={option.value}
                    className={`
                      flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all
                      ${answers[q.key] === option.value
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-green-300'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name={q.key}
                      value={option.value}
                      checked={answers[q.key] === option.value}
                      onChange={() => handleAnswerChange(q.key, option.value)}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="font-bold text-lg mb-1">{option.value}</div>
                      <div className="text-sm">{option.label}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-white rounded-lg">
          <p className="text-lg font-bold text-gray-900">
            Score Automazione: <span className="text-green-600">{autoScore}/8</span>
          </p>
        </div>
      </div>

      {/* Sezione CARICO COGNITIVO */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6" style={{ backgroundColor: '#fce4d6' }}>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          🟠 CARICO COGNITIVO - Quanto pensiero richiede?
        </h3>

        <div className="space-y-6">
          {cognitiveQuestions.map((q) => (
            <div key={q.key}>
              <p className="font-semibold text-gray-800 mb-3">{q.question}</p>
              <div className="flex gap-4">
                {q.options.map((option) => (
                  <label
                    key={option.value}
                    className={`
                      flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all
                      ${answers[q.key] === option.value
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-300 hover:border-orange-300'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name={q.key}
                      value={option.value}
                      checked={answers[q.key] === option.value}
                      onChange={() => handleAnswerChange(q.key, option.value)}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="font-bold text-lg mb-1">{option.value}</div>
                      <div className="text-sm">{option.label}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-white rounded-lg">
          <p className="text-lg font-bold text-gray-900">
            Score Carico Cognitivo: <span className="text-orange-600">{cogScore}/8</span>
          </p>
        </div>
      </div>

      {/* Preview Risultato */}
      {strategy && (
        <div
          className="rounded-lg shadow-lg p-6 mb-6 text-white"
          style={{ backgroundColor: strategy.color }}
        >
          <h3 className="text-2xl font-bold mb-3">📊 Strategia AI</h3>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-3">
            <p className="text-sm opacity-90 mb-1">Score Automazione: {autoScore}/8</p>
            <p className="text-sm opacity-90">Score Carico Cognitivo: {cogScore}/8</p>
          </div>
          <p className="text-3xl font-bold mb-2">{strategy.name}</p>
          <p className="text-lg">{strategy.desc}</p>
        </div>
      )}

      {/* Complessità di Implementazione */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-3">
          ⚙️ Complessità di Implementazione
        </h3>
        <p className="text-gray-600 mb-4 text-sm">
          Quanto sforzo richiederà implementare questa strategia AI? (1 = molto facile, 5 = molto complesso)
        </p>

        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map((value) => (
            <label
              key={value}
              className={`
                flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all text-center
                ${complessita === value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-300'
                }
              `}
            >
              <input
                type="radio"
                name="complessita"
                value={value}
                checked={complessita === value}
                onChange={() => setComplessita(value)}
                className="sr-only"
              />
              <div className="font-bold text-2xl mb-1">{value}</div>
              <div className="text-xs text-gray-600">
                {value === 1 && 'Molto facile'}
                {value === 2 && 'Facile'}
                {value === 3 && 'Media'}
                {value === 4 && 'Difficile'}
                {value === 5 && 'Molto difficile'}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(2)}
          className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          ← Indietro
        </button>

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={!allQuestionsAnswered()}
            className={`
              font-bold py-3 px-6 rounded-lg transition-colors
              ${allQuestionsAnswered()
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            ✓ Salva Valutazione
          </button>

          {allEvaluated && (
            <button
              onClick={() => setCurrentStep(4)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Vedi Risultati →
            </button>
          )}
        </div>
      </div>

      {!allEvaluated && evaluatedCount > 0 && (
        <div className="mt-4 text-center text-gray-600">
          <p>Valuta tutti gli step per procedere ai risultati</p>
        </div>
      )}
    </div>
  );
};
