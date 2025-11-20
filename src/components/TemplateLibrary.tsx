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
  onClose: () => void;
}

export default function TemplateLibrary({ onSelectTemplate, onClose }: TemplateLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);

  // Filtra template in base a categoria e ricerca
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

  const getCategoryColor = (categoryId: string) => {
    const category = templateCategories.find((c) => c.id === categoryId);
    return category?.color || 'gray';
  };

  const colorMap: Record<string, { bg: string; text: string; hover: string; border: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-800', hover: 'hover:bg-blue-200', border: 'border-blue-300' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-800', hover: 'hover:bg-purple-200', border: 'border-purple-300' },
    green: { bg: 'bg-green-100', text: 'text-green-800', hover: 'hover:bg-green-200', border: 'border-green-300' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', hover: 'hover:bg-yellow-200', border: 'border-yellow-300' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800', hover: 'hover:bg-indigo-200', border: 'border-indigo-300' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-800', hover: 'hover:bg-orange-200', border: 'border-orange-300' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-800', hover: 'hover:bg-pink-200', border: 'border-pink-300' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-800', hover: 'hover:bg-gray-200', border: 'border-gray-300' },
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">📚 Template Library</h2>
            <p className="text-sm opacity-90 mt-1">
              {workflowTemplates.length} template pre-configurati per iniziare rapidamente
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
            aria-label="Chiudi"
          >
            ×
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <input
            type="text"
            placeholder="🔍 Cerca template... (es: 'onboarding', 'email', 'fatture')"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedCategory(null); // Reset category quando cerco
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Categories */}
        {!searchQuery && (
          <div className="px-6 py-4 border-b bg-white overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  selectedCategory === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🏠 Tutti ({workflowTemplates.length})
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
                        : `bg-gray-100 text-gray-700 ${colors.hover}`
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
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Nessun template trovato</h3>
              <p className="text-gray-600">
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

                return (
                  <div
                    key={template.id}
                    className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    {/* Template Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-3xl">{template.icon}</div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${colors.bg} ${colors.text}`}
                      >
                        {categoryInfo?.icon} {categoryInfo?.name}
                      </span>
                    </div>

                    {/* Template Info */}
                    <h3 className="font-bold text-lg mb-2 text-gray-900">{template.titolo}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.descrizione}</p>

                    {/* Template Stats */}
                    <div className="flex gap-2 text-xs text-gray-500 mb-3">
                      <span>⏱️ {template.workflow.tempoMedio}min</span>
                      <span>🔁 {template.workflow.frequenza}x/mese</span>
                      <span>
                        📊 {(template.workflow.tempoMedio * template.workflow.frequenza) / 60}h/mese
                      </span>
                    </div>

                    {/* Tools Used */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.workflow.tool.slice(0, 3).map((tool, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {tool}
                        </span>
                      ))}
                      {template.workflow.tool.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
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
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
                    >
                      ✨ Usa questo template
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <p className="text-sm text-gray-600">
            💡 <strong>Tip:</strong> Puoi personalizzare il template dopo averlo selezionato
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
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
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Detail Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{selectedTemplate.icon}</span>
                <div>
                  <h3 className="text-2xl font-bold">{selectedTemplate.titolo}</h3>
                  <p className="text-sm opacity-90">{selectedTemplate.descrizione}</p>
                </div>
              </div>
            </div>

            {/* Detail Content */}
            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">📝 Descrizione Completa</h4>
                <p className="text-gray-600">{selectedTemplate.workflow.descrizione}</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2">🛠️ Tool Utilizzati</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.workflow.tool.map((tool, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">📥 Input</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {selectedTemplate.workflow.input.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">📤 Output</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {selectedTemplate.workflow.output.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2">⚠️ Pain Points</h4>
                <p className="text-gray-600 text-sm italic">"{selectedTemplate.workflow.painPoints}"</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Tempo Medio</div>
                  <div className="text-xl font-bold text-gray-900">
                    {selectedTemplate.workflow.tempoMedio} min
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Frequenza</div>
                  <div className="text-xl font-bold text-gray-900">
                    {selectedTemplate.workflow.frequenza}x / mese
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Tempo Totale Mensile</div>
                  <div className="text-xl font-bold text-blue-600">
                    {((selectedTemplate.workflow.tempoMedio * selectedTemplate.workflow.frequenza) / 60).toFixed(
                      1
                    )}{' '}
                    ore
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Owner</div>
                  <div className="text-xl font-bold text-gray-900">{selectedTemplate.workflow.owner}</div>
                </div>
              </div>
            </div>

            {/* Detail Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Indietro
              </button>
              <button
                onClick={() => handleUseTemplate(selectedTemplate)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                ✨ Usa questo template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
