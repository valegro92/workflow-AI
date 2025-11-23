import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withHeaders } from './middleware/headers';
import { withValidation } from './middleware/validation';
import { withRateLimit } from './middleware/rateLimit';
import { withTimeout } from './middleware/timeout';

/**
 * AI VBA Generator Endpoint
 * POST /api/ai-generate-vba
 *
 * Genera codice VBA professionale per automatizzare il workflow in Excel/Office
 *
 * Request body:
 * {
 *   "workflow": {
 *     "titolo": "...",
 *     "descrizione": "...",
 *     "tool": [...],
 *     "input": [...],
 *     "output": [...],
 *     "painPoints": "..."
 *   }
 * }
 */

interface VBARequest {
  workflow: {
    titolo: string;
    descrizione: string;
    tool?: string[];
    input?: string[];
    output?: string[];
    painPoints?: string;
    tempoMedio?: number;
  };
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { workflow } = req.body as VBARequest;

  if (!workflow || !workflow.titolo || !workflow.descrizione) {
    return res.status(400).json({ error: 'Workflow with titolo and descrizione required' });
  }

  try {
    // Costruisci prompt per l'AI
    const prompt = buildVBAPrompt(workflow);

    // Chiama AI (Groq per velocità)
    const vbaCode = await generateVBAWithAI(prompt);

    return res.status(200).json({
      vbaCode,
      timestamp: new Date().toISOString(),
      filename: sanitizeFilename(workflow.titolo) + '.bas',
    });
  } catch (error: any) {
    console.error('AI VBA Generation error:', error);

    // Fallback: genera VBA semplice manualmente
    try {
      const fallbackVBA = generateSimpleVBA(workflow);
      return res.status(200).json({
        vbaCode: fallbackVBA,
        timestamp: new Date().toISOString(),
        filename: sanitizeFilename(workflow.titolo) + '.bas',
        fallback: true,
      });
    } catch (fallbackError: any) {
      return res.status(500).json({
        error: 'Errore generazione VBA',
        details: fallbackError.message,
      });
    }
  }
}

/**
 * Costruisce prompt professionale per generazione VBA di livello enterprise
 */
function buildVBAPrompt(workflow: any): string {
  const usesExcel = workflow.tool?.some((t: string) => t.toLowerCase().includes('excel'));
  const usesOutlook = workflow.tool?.some((t: string) => t.toLowerCase().includes('outlook') || t.toLowerCase().includes('email'));
  const usesWord = workflow.tool?.some((t: string) => t.toLowerCase().includes('word'));

  return `Sei un Senior VBA Developer con 15+ anni di esperienza. Genera codice VBA PROFESSIONALE, PRODUCTION-READY e ENTERPRISE-GRADE per automatizzare questo workflow:

**WORKFLOW DA AUTOMATIZZARE:**
Titolo: ${workflow.titolo}
Descrizione: ${workflow.descrizione}
${workflow.tool ? `Tool attualmente usati: ${workflow.tool.join(', ')}` : ''}
${workflow.input ? `Input richiesti: ${workflow.input.join(', ')}` : ''}
${workflow.output ? `Output prodotti: ${workflow.output.join(', ')}` : ''}
${workflow.painPoints ? `Pain Points da risolvere: ${workflow.painPoints}` : ''}
${workflow.tempoMedio ? `Tempo attuale: ${workflow.tempoMedio} minuti (da ridurre!)` : ''}

**REQUISITI ARCHITETTURALI CRITICI:**

1. **STRUTTURA MODULARE:**
   - Modulo principale con Sub Main() che orchestra il workflow
   - Funzioni separate per ogni step logico (max 50 righe per funzione)
   - Costanti globali in un modulo Config separato
   - Logging centralizzato in modulo Logger

2. **ERROR HANDLING ROBUSTO:**
   \`\`\`vba
   On Error GoTo ErrorHandler
   ' ... codice ...
   Exit Sub/Function
   ErrorHandler:
       Call LogError(Err.Number, Err.Description, "NomeFunzione")
       ' Rollback se necessario
       MsgBox "Errore: " & Err.Description, vbCritical
   End Sub
   \`\`\`

3. **LOGGING PROFESSIONALE:**
   - Funzione LogInfo(message) per info
   - Funzione LogWarning(message) per warning
   - Funzione LogError(errNum, errDesc, source) per errori
   - Log su foglio dedicato con timestamp, livello, messaggio

4. **BEST PRACTICES VBA:**
   - Option Explicit all'inizio di ogni modulo
   - Nomi descrittivi (PascalCase per Sub/Function, camelCase per variabili)
   - Commenti esaurienti per logica complessa
   - Validazione input all'inizio
   - Cleanup risorse (chiudi file, libera oggetti)
   - Usa With...End With per oggetti
   - Evita Select/Activate quando possibile

5. **INTEGRAZIONE OFFICE:**
${usesExcel ? `   - Excel: Range, Worksheet, Workbook manipulation
   - AutoFilter per filtrare dati
   - PivotTable se serve aggregazione
   - Formule con Application.WorksheetFunction` : ''}
${usesOutlook ? `   - Outlook: CreateObject("Outlook.Application")
   - Invia email con allegati
   - Gestisci cartelle e regole` : ''}
${usesWord ? `   - Word: CreateObject("Word.Application")
   - Mail merge per documenti
   - Bookmark per inserimenti dinamici` : ''}

6. **PERFORMANCE:**
   - Application.ScreenUpdating = False all'inizio
   - Application.Calculation = xlCalculationManual se cambi molte celle
   - Ripristina alla fine
   - Usa array per operazioni massive invece di loop cella per cella

7. **USER EXPERIENCE:**
   - Progress bar per operazioni lunghe (>5 sec)
   - Messaggi informativi chiari
   - Validazione input con messaggi d'errore utili
   - Conferma prima di operazioni distruttive

**TEMPLATE STRUTTURA:**
\`\`\`vba
' ===================================
' Modulo: Main_${workflow.titolo.replace(/\s+/g, '_')}
' Autore: AI Workflow Analyzer
' Data: ${new Date().toLocaleDateString('it-IT')}
' Descrizione: Automazione workflow - ${workflow.titolo}
' ===================================

Option Explicit

' Costanti
Const LOG_SHEET As String = "AutomationLog"
Const TIMEOUT_SECONDS As Long = 300

' Variabile globale per tracking
Private m_startTime As Date

' ===================================
' FUNZIONE PRINCIPALE
' ===================================
Public Sub Main()
    On Error GoTo ErrorHandler

    ' Inizializza ambiente
    Call InitializeEnvironment

    ' Esegui step workflow
    Call Step1_[Nome]
    Call Step2_[Nome]
    ' ... altri step ...

    ' Finalizza
    Call Finalize

    MsgBox "Workflow completato con successo!" & vbCrLf & _
           "Tempo: " & Format(Now - m_startTime, "nn:ss"), vbInformation
    Exit Sub

ErrorHandler:
    Call HandleError(Err.Number, Err.Description, "Main")
End Sub

' ===================================
' STEP DEL WORKFLOW
' ===================================
Private Sub Step1_[Nome]()
    ' Implementa primo step
End Sub

' ===================================
' UTILITY FUNCTIONS
' ===================================
Private Sub InitializeEnvironment()
    m_startTime = Now
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual
    Application.EnableEvents = False
    Call LogInfo("Workflow iniziato")
End Sub

Private Sub Finalize()
    Application.ScreenUpdating = True
    Application.Calculation = xlCalculationAutomatic
    Application.EnableEvents = True
    Call LogInfo("Workflow completato")
End Sub

Private Sub LogInfo(ByVal message As String)
    ' Implementa logging
End Sub

Private Sub HandleError(ByVal errNum As Long, ByVal errDesc As String, ByVal source As String)
    Application.ScreenUpdating = True
    Application.Calculation = xlCalculationAutomatic
    Call LogError(errNum, errDesc, source)
    MsgBox "Errore in " & source & ": " & errDesc, vbCritical
End Sub
\`\`\`

**GENERA ORA IL CODICE VBA COMPLETO, PROFESSIONALE E PRONTO PER PRODUCTION:**
- Implementa TUTTI gli step del workflow
- Includi gestione errori ROBUSTA
- Aggiungi logging DETTAGLIATO
- Scrivi commenti ESAURIENTI
- Segui le best practices
- Ottimizza per performance

RISPONDI SOLO CON CODICE VBA, SENZA MARKDOWN O SPIEGAZIONI.`;
}

/**
 * Genera VBA usando AI (Groq)
 */
async function generateVBAWithAI(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY non configurata');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Sei un Senior VBA Developer. Generi codice VBA professionale, modulare e production-ready. Output SOLO codice, senza spiegazioni o markdown.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Moderata per codice bilanciato
      max_tokens: 6000, // VBA può essere verboso
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  let vbaCode = data.choices[0]?.message?.content || '';

  // Pulisci output (rimuovi markdown code blocks se presenti)
  vbaCode = vbaCode.replace(/```vba\n?/g, '').replace(/```vb\n?/g, '').replace(/```\n?/g, '').trim();

  // Valida che sia VBA valido (almeno contiene Sub o Function)
  if (!vbaCode.includes('Sub ') && !vbaCode.includes('Function ')) {
    throw new Error('AI non ha generato VBA valido');
  }

  return vbaCode;
}

/**
 * Fallback: genera VBA semplice ma funzionale
 */
function generateSimpleVBA(workflow: any): string {
  const safeName = workflow.titolo.replace(/[^a-zA-Z0-9]/g, '_');
  const safeDesc = workflow.descrizione.replace(/"/g, '""');

  return `' ===================================
' Modulo: ${safeName}
' Generato: ${new Date().toLocaleString('it-IT')}
' Descrizione: ${workflow.titolo}
' ===================================

Option Explicit

' Funzione principale
Public Sub Esegui_${safeName}()
    On Error GoTo ErrorHandler

    Dim startTime As Date
    startTime = Now

    ' Disabilita aggiornamenti per performance
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual

    ' Log inizio
    Call LogToSheet("INFO", "Workflow '${workflow.titolo}' iniziato")

    ' ===================================
    ' IMPLEMENTA QUI LA LOGICA DEL WORKFLOW
    ' ===================================
    ' Descrizione: ${safeDesc}

    ${workflow.tool ? `' Tool da integrare: ${workflow.tool.join(', ')}` : ''}
    ${workflow.input ? `' Input richiesti: ${workflow.input.join(', ')}` : ''}
    ${workflow.output ? `' Output prodotti: ${workflow.output.join(', ')}` : ''}

    ' Esempio: Elaborazione dati
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(1)

    ' TODO: Inserisci qui il codice specifico per il workflow

    ' ===================================

    ' Ripristina impostazioni
    Application.ScreenUpdating = True
    Application.Calculation = xlCalculationAutomatic

    ' Log completamento
    Dim elapsed As String
    elapsed = Format(Now - startTime, "nn:ss")
    Call LogToSheet("INFO", "Workflow completato in " & elapsed)

    MsgBox "Workflow '" & "${workflow.titolo}" & "' completato con successo!" & vbCrLf & _
           "Tempo: " & elapsed, vbInformation, "Automazione Completata"

    Exit Sub

ErrorHandler:
    Application.ScreenUpdating = True
    Application.Calculation = xlCalculationAutomatic
    Call LogToSheet("ERROR", "Errore " & Err.Number & ": " & Err.Description)
    MsgBox "Errore durante l'esecuzione del workflow:" & vbCrLf & vbCrLf & _
           Err.Description, vbCritical, "Errore"
End Sub

' Funzione di logging su foglio
Private Sub LogToSheet(ByVal level As String, ByVal message As String)
    On Error Resume Next

    Dim logWs As Worksheet
    Set logWs = ThisWorkbook.Sheets("Log")

    ' Crea foglio Log se non exists
    If logWs Is Nothing Then
        Set logWs = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        logWs.Name = "Log"
        logWs.Range("A1:C1").Value = Array("Timestamp", "Livello", "Messaggio")
        logWs.Range("A1:C1").Font.Bold = True
    End If

    ' Aggiungi log
    Dim nextRow As Long
    nextRow = logWs.Cells(logWs.Rows.Count, 1).End(xlUp).Row + 1

    logWs.Cells(nextRow, 1).Value = Now
    logWs.Cells(nextRow, 2).Value = level
    logWs.Cells(nextRow, 3).Value = message

    ' Formatta
    If level = "ERROR" Then
        logWs.Rows(nextRow).Interior.Color = RGB(255, 200, 200)
    ElseIf level = "WARNING" Then
        logWs.Rows(nextRow).Interior.Color = RGB(255, 255, 200)
    End If

    On Error GoTo 0
End Sub
`;
}

/**
 * Sanitizza nome file per VBA
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 50);
}

// Applica middleware
export default withTimeout(
  withRateLimit(
    withValidation(
      withHeaders(handler, {
        cache: { strategy: 'no-cache' },
        security: true,
      }),
      {
        requiredFields: ['workflow'],
        maxSize: 50 * 1024,
      }
    ),
    {
      maxRequests: 5, // Limitato perché genera codice lungo
      windowMs: 60 * 1000,
    }
  ),
  30000 // 30 secondi timeout
);
