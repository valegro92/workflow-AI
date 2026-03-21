import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Workflow, Evaluation } from '../types';

/**
 * Struttura CSV per import/export workflow
 */
export interface WorkflowCSVRow {
  id: string;
  fase: string;
  titolo: string;
  descrizione: string;
  tool: string; // Separato da virgola
  input: string; // Separato da virgola
  output: string; // Separato da virgola
  tempoMedio: number;
  frequenza: number;
  csat?: number;
  errori?: number;
  painPoints: string;
  pii: string; // "Sì" / "No"
  hitl: string; // "Sì" / "No"
  citazioni: string; // "Sì" / "No"
  owner: string;
  note: string;
}

/**
 * Converte un Workflow in una riga CSV
 */
export function workflowToCSVRow(workflow: Workflow): WorkflowCSVRow {
  return {
    id: workflow.id,
    fase: workflow.fase,
    titolo: workflow.titolo,
    descrizione: workflow.descrizione,
    tool: workflow.tool.join(', '),
    input: workflow.input.join(', '),
    output: workflow.output.join(', '),
    tempoMedio: workflow.tempoMedio,
    frequenza: workflow.frequenza,
    csat: workflow.csat,
    errori: workflow.errori,
    painPoints: workflow.painPoints,
    pii: workflow.pii ? 'Sì' : 'No',
    hitl: workflow.hitl ? 'Sì' : 'No',
    citazioni: workflow.citazioni ? 'Sì' : 'No',
    owner: workflow.owner,
    note: workflow.note,
  };
}

/**
 * Converte una riga CSV in un Workflow
 */
export function csvRowToWorkflow(row: any): Workflow {
  // Parse arrays da stringhe separate da virgola
  const parseArray = (str: string): string[] => {
    if (!str || str.trim() === '') return [];
    return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
  };

  // Parse boolean
  const parseBoolean = (str: string): boolean => {
    if (!str) return false;
    const normalized = str.toLowerCase().trim();
    return normalized === 'sì' || normalized === 'si' || normalized === 'yes' || normalized === 'true' || normalized === '1';
  };

  const tempoMedio = parseFloat(row.tempoMedio) || 0;
  const frequenza = parseFloat(row.frequenza) || 0;

  return {
    id: row.id || `W${Date.now()}`,
    fase: row.fase || '',
    titolo: row.titolo || '',
    descrizione: row.descrizione || '',
    tool: parseArray(row.tool),
    input: parseArray(row.input),
    output: parseArray(row.output),
    tempoMedio,
    frequenza,
    tempoTotale: tempoMedio * frequenza,
    csat: row.csat ? parseFloat(row.csat) : undefined,
    errori: row.errori ? parseFloat(row.errori) : undefined,
    painPoints: row.painPoints || '',
    pii: parseBoolean(row.pii),
    hitl: parseBoolean(row.hitl),
    citazioni: parseBoolean(row.citazioni),
    owner: row.owner || '',
    note: row.note || '',
  };
}

/**
 * Esporta workflow in formato CSV
 */
export function exportWorkflowsToCSV(workflows: Workflow[]): string {
  const csvRows = workflows.map(workflowToCSVRow);
  return Papa.unparse(csvRows, {
    quotes: true,
    header: true,
  });
}

/**
 * Esporta workflow in formato Excel
 */
export function exportWorkflowsToExcel(workflows: Workflow[]): Blob {
  const csvRows = workflows.map(workflowToCSVRow);

  // Crea worksheet
  const ws = XLSX.utils.json_to_sheet(csvRows);

  // Imposta larghezza colonne
  const colWidths = [
    { wch: 8 },  // id
    { wch: 15 }, // fase
    { wch: 30 }, // titolo
    { wch: 50 }, // descrizione
    { wch: 30 }, // tool
    { wch: 30 }, // input
    { wch: 30 }, // output
    { wch: 12 }, // tempoMedio
    { wch: 10 }, // frequenza
    { wch: 8 },  // csat
    { wch: 8 },  // errori
    { wch: 40 }, // painPoints
    { wch: 8 },  // pii
    { wch: 8 },  // hitl
    { wch: 10 }, // citazioni
    { wch: 20 }, // owner
    { wch: 40 }, // note
  ];
  ws['!cols'] = colWidths;

  // Crea workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Workflows');

  // Genera file Excel
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Esporta tutto (workflows + evaluations) in JSON
 */
export function exportToJSON(
  workflows: Workflow[],
  evaluations: Record<string, Evaluation>
): string {
  return JSON.stringify(
    {
      workflows,
      evaluations,
      exportDate: new Date().toISOString(),
      version: '1.0',
    },
    null,
    2
  );
}

/**
 * Importa workflows da CSV
 */
export function importWorkflowsFromCSV(csvContent: string): Promise<Workflow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const workflows = results.data.map((row: any) => csvRowToWorkflow(row));
          resolve(workflows);
        } catch (error: any) {
          reject(error);
        }
      },
      error: (error: any) => {
        reject(error);
      },
    });
  });
}

/**
 * Importa workflows da Excel
 */
export function importWorkflowsFromExcel(file: File): Promise<Workflow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Prendi il primo sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Converti in JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Converti in workflows
        const workflows = jsonData.map((row: any) => csvRowToWorkflow(row));
        resolve(workflows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Errore nella lettura del file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Importa da JSON completo (workflows + evaluations)
 */
export function importFromJSON(jsonContent: string): {
  workflows: Workflow[];
  evaluations: Record<string, Evaluation>;
} {
  const data = JSON.parse(jsonContent);
  return {
    workflows: data.workflows || [],
    evaluations: data.evaluations || {},
  };
}

/**
 * Genera CSV template per l'import
 */
export function generateCSVTemplate(): string {
  const template: Partial<WorkflowCSVRow>[] = [
    {
      id: 'W001',
      fase: 'Esempio',
      titolo: 'Workflow di esempio',
      descrizione: 'Descrizione dettagliata del workflow',
      tool: 'Excel, Email',
      input: 'Dati cliente, Template',
      output: 'Report, Dashboard',
      tempoMedio: 30,
      frequenza: 10,
      csat: 4,
      errori: 5,
      painPoints: 'Processo manuale e ripetitivo',
      pii: 'Sì',
      hitl: 'No',
      citazioni: 'No',
      owner: 'Mario Rossi',
      note: 'Note aggiuntive',
    },
  ];

  return Papa.unparse(template, {
    quotes: true,
    header: true,
  });
}

/**
 * Valida i workflow importati
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateWorkflows(workflows: Workflow[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  workflows.forEach((workflow, index) => {
    const rowNum = index + 2; // +2 perché parte da 1 e c'è l'header

    // Validazioni obbligatorie
    if (!workflow.titolo || workflow.titolo.trim() === '') {
      errors.push(`Riga ${rowNum}: Titolo obbligatorio`);
    }

    if (!workflow.descrizione || workflow.descrizione.trim() === '') {
      errors.push(`Riga ${rowNum}: Descrizione obbligatoria`);
    }

    if (workflow.tempoMedio <= 0) {
      errors.push(`Riga ${rowNum}: Tempo medio deve essere > 0`);
    }

    if (workflow.frequenza <= 0) {
      errors.push(`Riga ${rowNum}: Frequenza deve essere > 0`);
    }

    // Warnings
    if (workflow.tool.length === 0) {
      warnings.push(`Riga ${rowNum}: Nessun tool specificato`);
    }

    if (workflow.input.length === 0) {
      warnings.push(`Riga ${rowNum}: Nessun input specificato`);
    }

    if (workflow.output.length === 0) {
      warnings.push(`Riga ${rowNum}: Nessun output specificato`);
    }

    if (!workflow.owner || workflow.owner.trim() === '') {
      warnings.push(`Riga ${rowNum}: Nessun owner specificato`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Download di un file
 */
export function downloadFile(content: string | Blob, filename: string, mimeType?: string) {
  const blob = typeof content === 'string'
    ? new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' })
    : content;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
