import React, { useState, useRef } from 'react';
import { Workflow, Evaluation } from '../types';
import {
  exportWorkflowsToCSV,
  exportWorkflowsToExcel,
  exportToJSON,
  importWorkflowsFromCSV,
  importWorkflowsFromExcel,
  importFromJSON,
  generateCSVTemplate,
  validateWorkflows,
  downloadFile,
} from '../utils/importExport';

interface ImportExportProps {
  workflows: Workflow[];
  evaluations: Record<string, Evaluation>;
  onImport: (workflows: Workflow[], evaluations?: Record<string, Evaluation>) => void;
  onClose: () => void;
}

type Tab = 'export' | 'import';

export default function ImportExport({ workflows, evaluations, onImport, onClose }: ImportExportProps) {
  const [activeTab, setActiveTab] = useState<Tab>('export');
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | 'warning' | null;
    message: string;
    details?: string[];
  }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === EXPORT FUNCTIONS ===

  const handleExportCSV = () => {
    const csv = exportWorkflowsToCSV(workflows);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile(csv, `workflows-${timestamp}.csv`, 'text/csv');
    setImportStatus({ type: 'success', message: 'CSV esportato con successo!' });
  };

  const handleExportExcel = () => {
    const blob = exportWorkflowsToExcel(workflows);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile(blob, `workflows-${timestamp}.xlsx`);
    setImportStatus({ type: 'success', message: 'Excel esportato con successo!' });
  };

  const handleExportJSON = () => {
    const json = exportToJSON(workflows, evaluations);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile(json, `workflows-complete-${timestamp}.json`, 'application/json');
    setImportStatus({ type: 'success', message: 'JSON esportato con successo!' });
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    downloadFile(template, 'workflow-template.csv', 'text/csv');
    setImportStatus({ type: 'success', message: 'Template CSV scaricato!' });
  };

  // === IMPORT FUNCTIONS ===

  const processImportedWorkflows = async (importedWorkflows: Workflow[], evaluations?: Record<string, Evaluation>) => {
    // Validazione
    const validation = validateWorkflows(importedWorkflows);

    if (!validation.isValid) {
      setImportStatus({
        type: 'error',
        message: `Trovati ${validation.errors.length} errori nel file:`,
        details: validation.errors,
      });
      return;
    }

    // Mostra warnings se presenti
    if (validation.warnings.length > 0) {
      setImportStatus({
        type: 'warning',
        message: `${importedWorkflows.length} workflow importati con ${validation.warnings.length} avvisi:`,
        details: validation.warnings.slice(0, 5), // Mostra solo i primi 5
      });
    } else {
      setImportStatus({
        type: 'success',
        message: `${importedWorkflows.length} workflow importati con successo!`,
      });
    }

    // Invia i workflow importati al parent
    onImport(importedWorkflows, evaluations);
  };

  const handleFileSelect = async (file: File) => {
    setImportStatus({ type: null, message: '' });

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();

      if (fileExt === 'csv') {
        const text = await file.text();
        const importedWorkflows = await importWorkflowsFromCSV(text);
        await processImportedWorkflows(importedWorkflows);
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        const importedWorkflows = await importWorkflowsFromExcel(file);
        await processImportedWorkflows(importedWorkflows);
      } else if (fileExt === 'json') {
        const text = await file.text();
        const { workflows: importedWorkflows, evaluations: importedEvaluations } = importFromJSON(text);
        await processImportedWorkflows(importedWorkflows, importedEvaluations);
      } else {
        setImportStatus({
          type: 'error',
          message: 'Formato file non supportato. Usa CSV, Excel o JSON.',
        });
      }
    } catch (error: any) {
      setImportStatus({
        type: 'error',
        message: 'Errore durante l\'importazione:',
        details: [error.message || 'Errore sconosciuto'],
      });
    }
  };

  // === DRAG & DROP ===

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  // === RENDER ===

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-dark-hover border-b border-brand/30 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Import / Export Workflow</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
            aria-label="Chiudi"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-border">
          <button
            className={`flex-1 px-6 py-3 font-semibold ${
              activeTab === 'export'
                ? 'border-b-2 border-brand text-brand'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('export')}
          >
            Export
          </button>
          <button
            className={`flex-1 px-6 py-3 font-semibold ${
              activeTab === 'import'
                ? 'border-b-2 border-brand text-brand'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('import')}
          >
            Import
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] bg-dark-card text-gray-300">
          {/* Status Message */}
          {importStatus.type && (
            <div
              className={`mb-4 p-4 rounded-lg ${
                importStatus.type === 'success'
                  ? 'bg-green-900/50 border border-green-700 text-green-300'
                  : importStatus.type === 'warning'
                  ? 'bg-yellow-900/50 border border-yellow-700 text-yellow-300'
                  : 'bg-red-900/50 border border-red-700 text-red-300'
              }`}
            >
              <p className="font-semibold">{importStatus.message}</p>
              {importStatus.details && importStatus.details.length > 0 && (
                <ul className="mt-2 text-sm list-disc list-inside">
                  {importStatus.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* EXPORT TAB */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <p className="text-gray-400 mb-4">
                Esporta i tuoi {workflows.length} workflow in diversi formati:
              </p>

              <button
                onClick={handleExportCSV}
                className="w-full flex items-center justify-between p-4 border-2 border-dark-border rounded-lg bg-dark-card hover:border-brand hover:bg-dark-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📄</span>
                  <div className="text-left">
                    <h3 className="font-semibold text-white">CSV (Comma-Separated Values)</h3>
                    <p className="text-sm text-gray-400">
                      Compatibile con Excel, Google Sheets, e altri strumenti
                    </p>
                  </div>
                </div>
                <span className="text-brand font-semibold">Esporta →</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="w-full flex items-center justify-between p-4 border-2 border-dark-border rounded-lg bg-dark-card hover:border-brand hover:bg-dark-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📊</span>
                  <div className="text-left">
                    <h3 className="font-semibold text-white">Excel (.xlsx)</h3>
                    <p className="text-sm text-gray-400">
                      File Excel nativo con colonne formattate
                    </p>
                  </div>
                </div>
                <span className="text-brand font-semibold">Esporta →</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="w-full flex items-center justify-between p-4 border-2 border-dark-border rounded-lg bg-dark-card hover:border-brand hover:bg-dark-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🔧</span>
                  <div className="text-left">
                    <h3 className="font-semibold text-white">JSON Completo</h3>
                    <p className="text-sm text-gray-400">
                      Include workflow + valutazioni (per backup completo)
                    </p>
                  </div>
                </div>
                <span className="text-brand font-semibold">Esporta →</span>
              </button>

              <div className="mt-8 pt-6 border-t border-dark-border">
                <p className="text-sm text-gray-400 mb-3">
                  <strong className="text-gray-300">Suggerimento:</strong> Usa CSV o Excel per condividere con colleghi o importare in altri strumenti.
                  Usa JSON per backup completi che includono anche le valutazioni.
                </p>
              </div>
            </div>
          )}

          {/* IMPORT TAB */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <p className="text-gray-400 mb-4">
                Importa workflow da file CSV, Excel o JSON:
              </p>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors
                  ${
                    isDragging
                      ? 'border-brand bg-brand-50'
                      : 'border-dark-border hover:border-gray-500 hover:bg-dark-hover'
                  }
                `}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-5xl mb-4">📁</div>
                <p className="text-lg font-semibold text-white mb-2">
                  Trascina qui il file o clicca per selezionare
                </p>
                <p className="text-sm text-gray-400">
                  Formati supportati: CSV, Excel (.xlsx, .xls), JSON
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.json"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {/* Template Download */}
              <div className="bg-brand-50 border border-brand/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-brand-light mb-1">
                      Prima volta che importi?
                    </h4>
                    <p className="text-sm text-brand-light mb-3">
                      Scarica il template CSV per vedere la struttura corretta dei dati.
                    </p>
                    <button
                      onClick={handleDownloadTemplate}
                      className="bg-brand text-dark-bg px-4 py-2 rounded-lg hover:opacity-90 transition-colors text-sm font-semibold"
                    >
                      📥 Scarica Template CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Import Instructions */}
              <div className="bg-dark-hover rounded-lg p-4 text-sm text-gray-300">
                <h4 className="font-semibold mb-2">Istruzioni per l'import:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Campi obbligatori: titolo, descrizione, tempoMedio, frequenza</li>
                  <li>Array (tool, input, output): separa con virgola (es: "Excel, Word")</li>
                  <li>Booleani (pii, hitl, citazioni): usa "Si" o "No"</li>
                  <li>I workflow importati si <strong>aggiungeranno</strong> a quelli esistenti</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-dark-hover px-6 py-4 flex justify-end gap-3 border-t border-dark-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:bg-dark-border rounded-lg transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
