/**
 * Transcription Parser Utility
 *
 * Parses various transcription formats (TXT, VTT, SRT, DOCX) into clean text
 * for workflow extraction. Handles common formats from Teams, Zoom, Google Meet.
 */

import mammoth from 'mammoth';

export interface TranscriptionParseResult {
  text: string;
  format: 'txt' | 'vtt' | 'srt' | 'docx' | 'unknown';
  speakers: string[];
  duration?: string;
  segments?: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  speaker?: string;
  text: string;
  startTime?: string;
  endTime?: string;
}

/**
 * Supported file extensions for transcription import
 */
export const SUPPORTED_TRANSCRIPTION_EXTENSIONS = ['.txt', '.vtt', '.srt', '.md', '.docx'];

/**
 * Max file size for transcription files (25MB for Word documents)
 */
export const MAX_TRANSCRIPTION_SIZE = 25 * 1024 * 1024;

/**
 * Validates a transcription file before parsing
 */
export function validateTranscriptionFile(file: File): { valid: boolean; error?: string } {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();

  if (!SUPPORTED_TRANSCRIPTION_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Formato non supportato. Formati accettati: ${SUPPORTED_TRANSCRIPTION_EXTENSIONS.join(', ')}`
    };
  }

  if (file.size > MAX_TRANSCRIPTION_SIZE) {
    return {
      valid: false,
      error: `File troppo grande. Dimensione massima: ${MAX_TRANSCRIPTION_SIZE / 1024 / 1024}MB`
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'Il file è vuoto'
    };
  }

  return { valid: true };
}

/**
 * Detects the format of a transcription file based on content
 */
export function detectTranscriptionFormat(content: string): 'txt' | 'vtt' | 'srt' | 'unknown' {
  const trimmed = content.trim();

  // WebVTT format starts with "WEBVTT"
  if (trimmed.startsWith('WEBVTT')) {
    return 'vtt';
  }

  // SRT format: starts with a number followed by timestamp pattern
  const srtPattern = /^\d+\s*\n\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}/;
  if (srtPattern.test(trimmed)) {
    return 'srt';
  }

  // Check for timestamp patterns common in meeting transcriptions
  const meetingPattern = /^\d{2}:\d{2}(:\d{2})?\s*[-–]\s*\d{2}:\d{2}/m;
  if (meetingPattern.test(trimmed)) {
    return 'vtt'; // Treat as VTT-like format
  }

  return 'txt';
}

/**
 * Parses WebVTT format transcription
 *
 * Example VTT:
 * WEBVTT
 *
 * 00:00:00.000 --> 00:00:05.000
 * <v Speaker Name>Hello, this is the transcription text.
 */
export function parseVTT(content: string): TranscriptionParseResult {
  const lines = content.split('\n');
  const segments: TranscriptionSegment[] = [];
  const speakers = new Set<string>();

  let currentSegment: Partial<TranscriptionSegment> = {};
  let textBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip WEBVTT header and NOTE comments
    if (line === 'WEBVTT' || line.startsWith('NOTE') || line.startsWith('STYLE')) {
      continue;
    }

    // Timestamp line pattern: 00:00:00.000 --> 00:00:05.000
    const timestampMatch = line.match(/^(\d{2}:\d{2}[:\.]?\d{0,2}[,\.]?\d{0,3})\s*-->\s*(\d{2}:\d{2}[:\.]?\d{0,2}[,\.]?\d{0,3})/);

    if (timestampMatch) {
      // Save previous segment if exists
      if (textBuffer.length > 0) {
        currentSegment.text = textBuffer.join(' ').trim();
        if (currentSegment.text) {
          segments.push(currentSegment as TranscriptionSegment);
        }
        textBuffer = [];
      }

      currentSegment = {
        startTime: timestampMatch[1],
        endTime: timestampMatch[2]
      };
    } else if (line && !line.match(/^\d+$/)) {
      // Text line (not a cue number)
      let text = line;

      // Extract speaker from VTT voice tag: <v Speaker Name>text
      const voiceMatch = text.match(/^<v\s+([^>]+)>(.*)$/);
      if (voiceMatch) {
        currentSegment.speaker = voiceMatch[1].trim();
        speakers.add(currentSegment.speaker);
        text = voiceMatch[2];
      }

      // Extract speaker from common format: "Speaker Name: text" or "[Speaker Name] text"
      const speakerMatch = text.match(/^(?:\[([^\]]+)\]|([^:]+):)\s*(.*)$/);
      if (speakerMatch && !currentSegment.speaker) {
        const speaker = (speakerMatch[1] || speakerMatch[2]).trim();
        // Only treat as speaker if it looks like a name (not too long, no special chars)
        if (speaker.length < 50 && !speaker.match(/[.!?]/)) {
          currentSegment.speaker = speaker;
          speakers.add(speaker);
          text = speakerMatch[3];
        }
      }

      // Remove HTML-like tags
      text = text.replace(/<[^>]+>/g, '').trim();

      if (text) {
        textBuffer.push(text);
      }
    }
  }

  // Don't forget the last segment
  if (textBuffer.length > 0) {
    currentSegment.text = textBuffer.join(' ').trim();
    if (currentSegment.text) {
      segments.push(currentSegment as TranscriptionSegment);
    }
  }

  // Combine all text for plain text output
  const fullText = segments.map(s => {
    if (s.speaker) {
      return `${s.speaker}: ${s.text}`;
    }
    return s.text;
  }).join('\n');

  return {
    text: fullText,
    format: 'vtt',
    speakers: Array.from(speakers),
    segments
  };
}

/**
 * Parses SRT (SubRip) format transcription
 *
 * Example SRT:
 * 1
 * 00:00:00,000 --> 00:00:05,000
 * Hello, this is the transcription text.
 *
 * 2
 * 00:00:05,000 --> 00:00:10,000
 * This is the next line.
 */
export function parseSRT(content: string): TranscriptionParseResult {
  const blocks = content.split(/\n\n+/);
  const segments: TranscriptionSegment[] = [];
  const speakers = new Set<string>();

  for (const block of blocks) {
    const lines = block.trim().split('\n');

    if (lines.length < 2) continue;

    // Find the timestamp line
    let timestampLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}/)) {
        timestampLineIndex = i;
        break;
      }
    }

    if (timestampLineIndex === -1) continue;

    const timestampMatch = lines[timestampLineIndex].match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);

    if (!timestampMatch) continue;

    // Text is everything after the timestamp line
    const textLines = lines.slice(timestampLineIndex + 1);
    let text = textLines.join(' ').trim();

    // Remove HTML tags and formatting
    text = text.replace(/<[^>]+>/g, '').replace(/\{[^}]+\}/g, '').trim();

    if (!text) continue;

    const segment: TranscriptionSegment = {
      startTime: timestampMatch[1],
      endTime: timestampMatch[2],
      text
    };

    // Try to extract speaker
    const speakerMatch = text.match(/^(?:\[([^\]]+)\]|([^:]{1,30}):)\s*(.+)$/);
    if (speakerMatch) {
      const speaker = (speakerMatch[1] || speakerMatch[2]).trim();
      if (speaker.length < 50 && !speaker.match(/[.!?]/)) {
        segment.speaker = speaker;
        segment.text = speakerMatch[3].trim();
        speakers.add(speaker);
      }
    }

    segments.push(segment);
  }

  // Combine text
  const fullText = segments.map(s => {
    if (s.speaker) {
      return `${s.speaker}: ${s.text}`;
    }
    return s.text;
  }).join('\n');

  return {
    text: fullText,
    format: 'srt',
    speakers: Array.from(speakers),
    segments
  };
}

/**
 * Parses plain text transcription
 * Handles common formats from meeting platforms like Teams, Zoom, Google Meet
 */
export function parsePlainText(content: string): TranscriptionParseResult {
  const lines = content.split('\n');
  const speakers = new Set<string>();
  const processedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try to extract speaker from common formats
    // Format 1: "Speaker Name (HH:MM:SS)" or "Speaker Name [HH:MM:SS]"
    const timeTagMatch = trimmed.match(/^([^(\[]+?)\s*[(\[]?\d{1,2}:\d{2}(:\d{2})?[)\]]?\s*$/);
    if (timeTagMatch) {
      // This is just a speaker label line, skip it
      continue;
    }

    // Format 2: "HH:MM:SS Speaker Name: text" (Teams format)
    const teamsMatch = trimmed.match(/^(\d{1,2}:\d{2}(:\d{2})?)\s+([^:]+):\s*(.*)$/);
    if (teamsMatch) {
      const speaker = teamsMatch[3].trim();
      const text = teamsMatch[4].trim();
      if (speaker && text) {
        speakers.add(speaker);
        processedLines.push(`${speaker}: ${text}`);
        continue;
      }
    }

    // Format 3: "Speaker Name: text" (generic)
    const genericSpeakerMatch = trimmed.match(/^([^:]{1,40}):\s*(.+)$/);
    if (genericSpeakerMatch) {
      const potentialSpeaker = genericSpeakerMatch[1].trim();
      const text = genericSpeakerMatch[2].trim();
      // Validate it looks like a speaker name (not too long, mostly letters)
      if (potentialSpeaker.length < 40 &&
          potentialSpeaker.match(/^[\p{L}\s.''-]+$/u) &&
          !potentialSpeaker.match(/^(http|www|nota|note|step|fase)/i)) {
        speakers.add(potentialSpeaker);
        processedLines.push(`${potentialSpeaker}: ${text}`);
        continue;
      }
    }

    // Format 4: "[Speaker Name] text" (bracket format)
    const bracketMatch = trimmed.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (bracketMatch) {
      const speaker = bracketMatch[1].trim();
      const text = bracketMatch[2].trim();
      if (speaker && text && speaker.length < 40) {
        speakers.add(speaker);
        processedLines.push(`${speaker}: ${text}`);
        continue;
      }
    }

    // No speaker detected, keep line as is
    processedLines.push(trimmed);
  }

  return {
    text: processedLines.join('\n'),
    format: 'txt',
    speakers: Array.from(speakers)
  };
}

/**
 * Main parsing function - auto-detects format and parses accordingly
 */
export function parseTranscription(content: string): TranscriptionParseResult {
  if (!content || !content.trim()) {
    return {
      text: '',
      format: 'unknown',
      speakers: []
    };
  }

  const format = detectTranscriptionFormat(content);

  switch (format) {
    case 'vtt':
      return parseVTT(content);
    case 'srt':
      return parseSRT(content);
    case 'txt':
    default:
      return parsePlainText(content);
  }
}

/**
 * Reads a transcription file and parses it
 * Handles both text files and Word documents
 */
export async function readAndParseTranscription(file: File): Promise<TranscriptionParseResult> {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();

  // Handle Word documents separately using mammoth
  if (extension === '.docx') {
    return parseWordDocument(file);
  }

  // Handle text-based files
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const result = parseTranscription(content);
        resolve(result);
      } catch (error) {
        reject(new Error(`Errore nel parsing della trascrizione: ${error instanceof Error ? error.message : 'unknown'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Errore nella lettura del file'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Parses Word document (.docx) transcription using mammoth
 */
export async function parseWordDocument(file: File): Promise<TranscriptionParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;

    if (!text || text.trim().length === 0) {
      return {
        text: '',
        format: 'docx',
        speakers: []
      };
    }

    // Parse the extracted text to find speakers
    const lines = text.split('\n');
    const speakers = new Set<string>();
    const processedLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Try to extract speaker from common formats
      // Format: "Speaker Name: text"
      const speakerMatch = trimmed.match(/^([^:]{1,40}):\s*(.+)$/);
      if (speakerMatch) {
        const potentialSpeaker = speakerMatch[1].trim();
        const lineText = speakerMatch[2].trim();
        if (potentialSpeaker.length < 40 &&
            potentialSpeaker.match(/^[\p{L}\s.''-]+$/u) &&
            !potentialSpeaker.match(/^(http|www|nota|note|step|fase|input|output|tool)/i)) {
          speakers.add(potentialSpeaker);
          processedLines.push(`${potentialSpeaker}: ${lineText}`);
          continue;
        }
      }

      // Format: "[Speaker Name] text"
      const bracketMatch = trimmed.match(/^\[([^\]]+)\]\s*(.*)$/);
      if (bracketMatch) {
        const speaker = bracketMatch[1].trim();
        const lineText = bracketMatch[2].trim();
        if (speaker && lineText && speaker.length < 40) {
          speakers.add(speaker);
          processedLines.push(`${speaker}: ${lineText}`);
          continue;
        }
      }

      processedLines.push(trimmed);
    }

    return {
      text: processedLines.join('\n'),
      format: 'docx',
      speakers: Array.from(speakers)
    };
  } catch (error) {
    throw new Error(`Errore nel parsing del documento Word: ${error instanceof Error ? error.message : 'unknown'}`);
  }
}

/**
 * Cleans and normalizes transcription text for workflow extraction
 */
export function cleanTranscriptionText(text: string): string {
  return text
    // Remove multiple consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove timestamps in various formats
    .replace(/\d{1,2}:\d{2}(:\d{2})?(,\d{3})?/g, '')
    // Remove common filler words (Italian)
    .replace(/\b(uhm|ehm|mh|ah|oh|beh|cioè|quindi|allora|ecco|praticamente)\b/gi, '')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    .trim();
}
