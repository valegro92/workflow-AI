// @ts-ignore - mammoth doesn't have types
import mammoth from 'mammoth';
import { Workflow } from '../types';

interface ParsedStep {
  numero: number;
  descrizione: string;
  tool: string;
  input: string;
  output: string;
  tempoStimato: number;
  painPoints: string;
}

interface ParsedWorkflow {
  nome: string;
  categoria: string;
  frequenza: number;
  steps: ParsedStep[];
}

/**
 * Estrae il testo da un file Word (.docx)
 */
export async function extractTextFromWord(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Parsa il contenuto di un documento Word e estrae i workflow
 * Supporta il formato "Mappatura del workflow n. X"
 */
export function parseWorkflowDocument(text: string): ParsedWorkflow | null {
  try {
    // Normalizza il testo: rimuovi spazi multipli e righe vuote eccessive
    const normalizedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Estrai nome del workflow
    const nomeMatch = normalizedText.match(/Quale processo sto mappando\?\s*(.+?)(?:\n|$)/i);
    const nome = nomeMatch ? nomeMatch[1].trim() : 'Workflow Importato';

    // Estrai categoria (se presente)
    const categoriaMatch = normalizedText.match(/Categoria:\s*(.+?)(?:\n|$)/i);
    const categoria = categoriaMatch ? categoriaMatch[1].trim() : 'Generale';

    // Estrai frequenza
    const frequenzaMatch = normalizedText.match(/Frequenza:\s*(\w+)/i);
    let frequenza = 30; // default mensile
    if (frequenzaMatch) {
      const freq = frequenzaMatch[1].toLowerCase();
      if (freq.includes('giorn') || freq.includes('daily')) frequenza = 365;
      else if (freq.includes('settiman') || freq.includes('week')) frequenza = 52;
      else if (freq.includes('mes') || freq.includes('month')) frequenza = 12;
      else if (freq.includes('ann') || freq.includes('year')) frequenza = 1;
      else if (freq.includes('trimest') || freq.includes('quarter')) frequenza = 4;
    }

    // Estrai gli step
    const steps = parseSteps(normalizedText);

    if (steps.length === 0) {
      console.warn('Nessuno step trovato nel documento');
      return null;
    }

    return {
      nome,
      categoria,
      frequenza,
      steps,
    };
  } catch (error) {
    console.error('Errore nel parsing del documento:', error);
    return null;
  }
}

/**
 * Estrae gli step dal testo del documento
 */
function parseSteps(text: string): ParsedStep[] {
  const steps: ParsedStep[] = [];

  // Trova tutti i blocchi "step N"
  const stepRegex = /step\s+(\d+)([\s\S]*?)(?=step\s+\d+|$)/gi;
  const stepMatches = [...text.matchAll(stepRegex)];

  for (const match of stepMatches) {
    const stepNumber = parseInt(match[1]);
    const stepContent = match[2];

    const step = parseStepContent(stepNumber, stepContent);
    if (step) {
      steps.push(step);
    }
  }

  return steps;
}

/**
 * Parsa il contenuto di un singolo step
 */
function parseStepContent(numero: number, content: string): ParsedStep | null {
  try {
    // Estrai "Cosa faccio"
    const descrizioneMatch = content.match(/Cosa faccio[:\s]*(.+?)(?=Che tool uso|$)/is);
    const descrizione = descrizioneMatch ? descrizioneMatch[1].trim() : '';

    // Estrai "Che tool uso"
    const toolMatch = content.match(/Che tool uso[:\s]*(.+?)(?=Input necessario|$)/is);
    const tool = toolMatch ? toolMatch[1].trim() : '';

    // Estrai "Input necessario"
    const inputMatch = content.match(/Input necessario[:\s]*(.+?)(?=Output prodotto|$)/is);
    const input = inputMatch ? inputMatch[1].trim() : '';

    // Estrai "Output prodotto"
    const outputMatch = content.match(/Output prodotto[:\s]*(.+?)(?=Quanto tempo impiego|$)/is);
    const output = outputMatch ? outputMatch[1].trim() : '';

    // Estrai "Quanto tempo impiego"
    const tempoMatch = content.match(/Quanto tempo impiego[:\s]*(.+?)(?=Pain points|$)/is);
    const tempoText = tempoMatch ? tempoMatch[1].trim() : '';
    const tempoStimato = parseTempoStimato(tempoText);

    // Estrai "Pain points"
    const painPointsMatch = content.match(/Pain points[:\s]*(.+?)(?=step \d+|$)/is);
    const painPoints = painPointsMatch ? painPointsMatch[1].trim() : '';

    // Valida che ci sia almeno una descrizione
    if (!descrizione) {
      console.warn(`Step ${numero} senza descrizione, saltato`);
      return null;
    }

    return {
      numero,
      descrizione,
      tool,
      input,
      output,
      tempoStimato,
      painPoints,
    };
  } catch (error) {
    console.error(`Errore nel parsing dello step ${numero}:`, error);
    return null;
  }
}

/**
 * Converte testo tempo in minuti
 * Esempi: "5 minuti", "1 ora", "30min", "1.5h"
 */
function parseTempoStimato(tempoText: string): number {
  if (!tempoText) return 0;

  const text = tempoText.toLowerCase();

  // Cerca pattern numerici
  const numMatch = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!numMatch) return 0;

  const num = parseFloat(numMatch[1].replace(',', '.'));

  // Determina l'unità
  if (text.includes('ora') || text.includes('hour') || text.includes('h')) {
    return num * 60; // converti in minuti
  } else if (text.includes('giorn') || text.includes('day') || text.includes('d')) {
    return num * 60 * 8; // 8 ore lavorative
  } else if (text.includes('settiman') || text.includes('week') || text.includes('w')) {
    return num * 60 * 8 * 5; // 5 giorni lavorativi
  } else {
    // Default: minuti
    return num;
  }
}

/**
 * Converte un ParsedWorkflow in un array di oggetti Workflow validi per l'app
 * Ogni step diventa un Workflow separato
 */
export function convertToWorkflows(parsed: ParsedWorkflow): Omit<Workflow, 'id' | 'tempoTotale'>[] {
  return parsed.steps.map((step) => ({
    fase: parsed.nome, // Il nome del processo diventa la "fase"
    titolo: `Step ${step.numero}: ${step.descrizione.substring(0, 50)}${step.descrizione.length > 50 ? '...' : ''}`,
    descrizione: step.descrizione,
    tool: step.tool ? step.tool.split(',').map((t) => t.trim()).filter(Boolean) : ['N/A'],
    input: step.input ? step.input.split(',').map((i) => i.trim()).filter(Boolean) : ['N/A'],
    output: step.output ? step.output.split(',').map((o) => o.trim()).filter(Boolean) : ['N/A'],
    tempoMedio: step.tempoStimato,
    frequenza: parsed.frequenza,
    csat: undefined,
    errori: undefined,
    painPoints: step.painPoints || '',
    pii: false,
    hitl: false,
    citazioni: false,
    owner: '',
    note: `Importato da Word - ${parsed.categoria}`,
  }));
}

/**
 * Funzione principale: importa un file Word e restituisce array di workflow pronti
 * Ogni step nel documento diventa un Workflow separato
 */
export async function importWorkflowsFromWord(
  file: File
): Promise<Omit<Workflow, 'id' | 'tempoTotale'>[]> {
  try {
    // Estrai testo dal file Word
    const text = await extractTextFromWord(file);

    // Parsa il contenuto
    const parsed = parseWorkflowDocument(text);

    if (!parsed) {
      throw new Error('Impossibile estrarre workflow dal documento');
    }

    // Converti in formato Workflow (un Workflow per ogni step)
    const workflows = convertToWorkflows(parsed);

    if (workflows.length === 0) {
      throw new Error('Nessuno step valido trovato nel documento');
    }

    return workflows;
  } catch (error) {
    console.error('Errore durante l\'importazione del workflow da Word:', error);
    throw error;
  }
}

/**
 * Valida che il file sia un .docx valido
 */
export function validateWordFile(file: File): { valid: boolean; error?: string } {
  // Controlla estensione
  if (!file.name.endsWith('.docx')) {
    return {
      valid: false,
      error: 'Il file deve essere in formato .docx (Word)',
    };
  }

  // Controlla dimensione (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Il file è troppo grande (max 10MB)',
    };
  }

  // Controlla MIME type
  const validMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];

  if (file.type && !validMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Formato file non valido. Usa file .docx',
    };
  }

  return { valid: true };
}
