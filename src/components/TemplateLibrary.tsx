import { useState } from 'react';
import { Workflow } from '../types';
import {
  templateCategories,
  workflowTemplates,
  WorkflowTemplate,
  getTemplatesByCategory,
  searchTemplates,
} from '../data/templates';

interface TemplateLibraryProps {
  onSelectTemplate: (workflow: Omit<Workflow, 'id' | 'tempoTotale'>) => void;
  onSelectMultiple?: (workflows: Omit<Workflow, 'id' | 'tempoTotale'>[]) => void;
  onClose: () => void;
}

export default function TemplateLibrary({ onSelectTemplate, onSelectMultiple, onClose }: TemplateLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  const getFilteredTemplates = () => {
    if (searchQuery.trim() !== '') {
      return searchTemplates(searchQuery);
    }
    if (selectedCategory) {
      return getTemplatesByCategory(selectedCategory);
    }
    return workflowTemplates;
  };

  const filteredTemplates = getFilteredTemplates();

  const handleUseTemplate = (template: WorkflowTemplate) => {
    onSelectTemplate(template.workflow);
    onClose();
  };

  const handleToggleTemplate = (templateId: string) => {
    setSelectedTemplates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  const handleImportSelected = () => {
    if (selectedTemplates.size === 0 || !onSelectMultiple) return;

    const workflows = workflowTemplates
      .filter((t) => selectedTemplates.has(t.id))
      .map((t) => t.workflow);

    onSelectMultiple(workflows);
    onClose();
  };

  const handleSelectAll = () => {
    const allIds = filteredTemplates.map((t) => t.id);
    setSelectedTemplates(new Set(allIds));
  };

  const handleClearSelection = () => {
    setSelectedTemplates(new Set());
  };

  const getCategoryColor = (categoryId: string) => {
    const category = templateCategories.find((c) => c.id === categoryId);
    return category?.color || 'gray';
  };

  const colorMap: Record<string, { bg: string; text: string; hover: string; border: string }> = {
    blue: { bg: 'bg-blue-900/30', text: 'text-blue-300', hover: 'hover:bg-blue-900/40', border: 'border-blue-500/50' },
    purple: { bg: 'bg-purple-900/30', text: 'text-purple-300', hover: 'hover:bg-purple-900/40', border: 'border-purple-500/50' },
    green: { bg: 'bg-green-900/30', text: 'text-green-300', hover: 'hover:bg-green-900/40', border: 'border-green-500/50' },
    yellow: { bg: 'bg-yellow-900/30', text: 'text-yellow-300', hover: 'hover:bg-yellow-900/40', border: 'border-yellow-500/50' },
    indigo: { bg: 'bg-indigo-900/30', text: 'text-indigo-300', hover: 'hover:bg-indigo-900/40', border: 'border-indigo-500/50' },
    orange: { bg: 'bg-orange-900/30', text: 'text-orange-300', hover: 'hover:bg-orange-900/40', border: 'border-orange-500/50' },
    pink: { bg: 'bg-pink-900/30', text: 'text-pink-300', hover: 'hover:bg-pink-900/40', border: 'border-pink-500/50' },
    red: { bg: 'bg-red-900/30', text: 'text-red-300', hover: 'hover:bg-red-900/40', border: 'border-red-500/50' },
    cyan: { bg: 'bg-cyan-900/30', text: 'text-cyan-300', hover: 'hover:bg-cyan-900/40', border: 'border-cyan-500/50' },
    teal: { bg: 'bg-teal-900/30', text: 'text-teal-300', hover: 'hover:bg-teal-900/40', border: 'border-teal-500/50' },
    gray: { bg: 'bg-gray-700/30', text: 'text-gray-300', hover: 'hover:bg-gray-700/40', border: 'border-gray-500/50' },
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-dark-border">
        {/* Header */}
        <div className="bg-dark-hover border-b border-brand/30 text-white px-6 py-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-2xl font-bold text-white">Template Library</h2>
              <p className="text-sm text-gray-400 mt-1">
                {workflowTemplates.length} template pre-configurati per iniziare rapidamente
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl font-bold transition-colors"
              aria-label="Chiudi"
            >
              ×
            </button>
          </div>

          {/* Multi-Select Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setMultiSelectMode(!multiSelectMode);
                  if (multiSelectMode) {
                    setSelectedTemplates(new Set());
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  multiSelectMode
                    ? 'bg-brand text-dark-bg'
                    : 'bg-dark-border hover:bg-dark-card text-gray-300'
                }`}
              >
                {multiSelectMode ? 'Selezione Multipla' : 'Abilita Selezione Multipla'}
              </button>

              {multiSelectMode && selectedTemplates.size > 0 && (
                <>
                  <div className="bg-brand-50 text-brand-light px-3 py-2 rounded-lg">
                    <span className="font-bold">{selectedTemplates.size}</span> selezionati
                  </div>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm bg-dark-border hover:bg-dark-card text-gray-300 px-3 py-1.5 rounded transition-colors"
                  >
                    Seleziona tutti ({filteredTemplates.length})
                  </button>
                  <button
                    onClick={handleClearSelection}
                    className="text-sm bg-dark-border hover:bg-dark-card text-gray-300 px-3 py-1.5 rounded transition-colors"
                  >
                    Deseleziona tutti
                  </button>
                </>
              )}
            </div>

            {multiSelectMode && selectedTemplates.size > 0 && (
              <button
                onClick={handleImportSelected}
                className="bg-brand text-dark-bg px-6 py-2 rounded-lg font-bold hover:bg-brand-light transition-colors shadow-lg"
              >
                Importa {selectedTemplates.size} Template
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-dark-border bg-dark-card">
          <input
            type="text"
            placeholder="Cerca template... (es: 'onboarding', 'email', 'fatture')"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedCategory(null);
            }}
            className="w-full px-4 py-2 bg-dark-hover border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {/* Categories */}
        {!searchQuery && (
          <div className="px-6 py-4 border-b border-dark-border bg-dark-card overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  selectedCategory === null
                    ? 'bg-brand text-dark-bg'
                    : 'bg-dark-hover text-gray-300 hover:bg-dark-border'
                }`}
              >
                Tutti ({workflowTemplates.length})
              </button>
              {templateCategories.map((category) => {
                const count = getTemplatesByCategory(category.id).length;
                const colors = colorMap[category.color];
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      selectedCategory === category.id
                        ? `${colors.bg} ${colors.text} border ${colors.border}`
                        : `bg-dark-hover text-gray-300 ${colors.hover}`
                    }`}
                  >
                    {category.icon} {category.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-dark-bg">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-300 mb-2">Nessun template trovato</h3>
              <p className="text-gray-400">
                {searchQuery
                  ? `Nessun risultato per "${searchQuery}"`
                  : 'Nessun template disponibile per questa categoria'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const categoryInfo = templateCategories.find((c) => c.id === template.categoria);
                const colors = colorMap[getCategoryColor(template.categoria)];
                const isSelected = selectedTemplates.has(template.id);

                return (
                  <div
                    key={template.id}
                    className={`bg-dark-card border-2 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer relative ${
                      isSelected && multiSelectMode
                        ? 'border-brand bg-brand-50/20'
                        : 'border-dark-border hover:border-brand/50'
                    }`}
                    onClick={() => {
                      if (multiSelectMode) {
                        handleToggleTemplate(template.id);
                      } else {
                        setSelectedTemplate(template);
                      }
                    }}
                  >
                    {/* Checkbox for Multi-Select */}
                    {multiSelectMode && (
                      <div className="absolute top-2 left-2 z-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleTemplate(template.id)}
                          className="w-5 h-5 text-brand rounded focus:ring-2 focus:ring-brand bg-dark-hover border-dark-border"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}

                    {/* Template Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className={`text-3xl ${multiSelectMode ? 'ml-7' : ''}`}>{template.icon}</div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${colors.bg} ${colors.text}`}
                      >
                        {categoryInfo?.icon} {categoryInfo?.name}
                      </span>
                    </div>

                    {/* Template Info */}
                    <h3 className="font-bold text-lg mb-2 text-white">{template.titolo}</h3>
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{template.descrizione}</p>

                    {/* Template Stats */}
                    <div className="flex gap-2 text-xs text-gray-500 mb-3">
                      <span>{template.workflow.tempoMedio}min</span>
                      <span>{template.workflow.frequenza}x/mese</span>
                      <span>
                        {(template.workflow.tempoMedio * template.workflow.frequenza) / 60}h/mese
                      </span>
                    </div>

                    {/* Tools Used */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.workflow.tool.slice(0, 3).map((tool, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-dark-hover text-gray-300 rounded text-xs"
                        >
                          {tool}
                        </span>
                      ))}
                      {template.workflow.tool.length > 3 && (
                        <span className="px-2 py-0.5 bg-dark-hover text-gray-300 rounded text-xs">
                          +{template.workflow.tool.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseTemplate(template);
                      }}
                      className="w-full bg-brand text-dark-bg py-2 rounded-lg hover:bg-brand-light transition-colors font-semibold text-sm"
                    >
                      Usa questo template
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-dark-card px-6 py-4 border-t border-dark-border flex justify-between items-center">
          <p className="text-sm text-gray-400">
            <strong className="text-gray-300">Tip:</strong> Puoi personalizzare il template dopo averlo selezionato
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:bg-dark-hover rounded-lg transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTemplate(null)}
        >
          <div
            className="bg-dark-card rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-dark-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Detail Header */}
            <div className="bg-dark-hover border-b border-brand/30 text-white px-6 py-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{selectedTemplate.icon}</span>
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedTemplate.titolo}</h3>
                  <p className="text-sm text-gray-400">{selectedTemplate.descrizione}</p>
                </div>
              </div>
            </div>

            {/* Detail Content */}
            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-300 mb-2">Descrizione Completa</h4>
                <p className="text-gray-400">{selectedTemplate.workflow.descrizione}</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-300 mb-2">Tool Utilizzati</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.workflow.tool.map((tool, idx) => (
                    <span key={idx} className="px-3 py-1 bg-brand-50 text-brand-light rounded-lg text-sm">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-300 mb-2">Input</h4>
                  <ul className="list-disc list-inside text-sm text-gray-400">
                    {selectedTemplate.workflow.input.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-300 mb-2">Output</h4>
                  <ul className="list-disc list-inside text-sm text-gray-400">
                    {selectedTemplate.workflow.output.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-300 mb-2">Pain Points</h4>
                <p className="text-gray-400 text-sm italic">"{selectedTemplate.workflow.painPoints}"</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-dark-hover p-4 rounded-lg">
                <div>
                  <div className="text-sm text-gray-400">Tempo Medio</div>
                  <div className="text-xl font-bold text-white">
                    {selectedTemplate.workflow.tempoMedio} min
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Frequenza</div>
                  <div className="text-xl font-bold text-white">
                    {selectedTemplate.workflow.frequenza}x / mese
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Tempo Totale Mensile</div>
                  <div className="text-xl font-bold text-brand">
                    {((selectedTemplate.workflow.tempoMedio * selectedTemplate.workflow.frequenza) / 60).toFixed(
                      1
                    )}{' '}
                    ore
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Owner</div>
                  <div className="text-xl font-bold text-white">{selectedTemplate.workflow.owner}</div>
                </div>
              </div>
            </div>

            {/* Detail Footer */}
            <div className="bg-dark-hover px-6 py-4 border-t border-dark-border flex justify-end gap-3">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 text-gray-300 hover:bg-dark-border rounded-lg transition-colors"
              >
                Indietro
              </button>
              <button
                onClick={() => handleUseTemplate(selectedTemplate)}
                className="px-6 py-2 bg-brand text-dark-bg rounded-lg hover:bg-brand-light transition-colors font-semibold"
              >
                Usa questo template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
