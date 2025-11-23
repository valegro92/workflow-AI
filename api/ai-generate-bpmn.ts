import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withHeaders } from './middleware/headers';
import { withValidation } from './middleware/validation';
import { withRateLimit } from './middleware/rateLimit';
import { withTimeout } from './middleware/timeout';

/**
 * AI BPMN Generator Endpoint
 * POST /api/ai-generate-bpmn
 *
 * Genera un diagramma BPMN 2.0 XML complesso usando AI
 * basato sulla descrizione dettagliata del workflow
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

interface BPMNRequest {
  workflow: {
    titolo: string;
    descrizione: string;
    tool?: string[];
    input?: string[];
    output?: string[];
    painPoints?: string;
    owner?: string;
  };
  relatedWorkflows?: Array<{
    titolo: string;
    descrizione: string;
    owner?: string;
  }>;
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { workflow } = req.body as BPMNRequest;

  if (!workflow || !workflow.titolo || !workflow.descrizione) {
    return res.status(400).json({ error: 'Workflow with titolo and descrizione required' });
  }

  try {
    // Costruisci prompt per l'AI
    const prompt = buildBPMNPrompt(workflow, req.body.relatedWorkflows);

    // Chiama AI (Groq per velocità)
    const bpmnXml = await generateBPMNWithAI(prompt);

    return res.status(200).json({
      bpmnXml,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('AI BPMN Generation error:', error);

    // Fallback: genera BPMN semplice manualmente
    try {
      const fallbackBpmn = generateSimpleBPMN(workflow);
      return res.status(200).json({
        bpmnXml: fallbackBpmn,
        timestamp: new Date().toISOString(),
        fallback: true,
      });
    } catch (fallbackError: any) {
      return res.status(500).json({
        error: 'Errore generazione BPMN',
        details: fallbackError.message,
      });
    }
  }
}

/**
 * Costruisce prompt avanzato per AI con layout professionale e Pool/Lane support
 */
function buildBPMNPrompt(workflow: any, relatedWorkflows?: any[]): string {
  // Determina se serve multi-pool/lane basandoti su owner diversi
  const owners = new Set<string>();
  if (workflow.owner) owners.add(workflow.owner);
  if (relatedWorkflows) {
    relatedWorkflows.forEach(w => {
      if (w.owner) owners.add(w.owner);
    });
  }

  const needsMultiLane = owners.size > 1;
  const ownersList = Array.from(owners);

  return `Sei il miglior ingegnere di processo BPMN al mondo. Analizza questa descrizione e genera un XML BPMN 2.0 completo, professionale e VALIDO.

**PROCESSO PRINCIPALE:**
Titolo: ${workflow.titolo}
Descrizione: ${workflow.descrizione}
${workflow.tool ? `Tool usati: ${workflow.tool.join(', ')}` : ''}
${workflow.input ? `Input: ${workflow.input.join(', ')}` : ''}
${workflow.output ? `Output: ${workflow.output.join(', ')}` : ''}
${workflow.painPoints ? `Pain Points: ${workflow.painPoints}` : ''}
${workflow.owner ? `Responsabile: ${workflow.owner}` : ''}

${relatedWorkflows && relatedWorkflows.length > 0 ? `**PROCESSI CORRELATI:**
${relatedWorkflows.map((w, i) => `${i + 1}. ${w.titolo} - ${w.descrizione}${w.owner ? ` (Responsabile: ${w.owner})` : ''}`).join('\n')}
` : ''}

${needsMultiLane ? `**IMPORTANTE:** Ci sono ${owners.size} responsabili diversi: ${ownersList.join(', ')}.
DEVI creare un POOL con ${owners.size} LANE, una per ogni responsabile.` : ''}

**REQUISITI CRITICI:**

1. **STRUTTURA XML BPMN 2.0 VALIDA:**
   - Namespace completi: bpmn, bpmndi, dc, di
   ${needsMultiLane ? `- USA <bpmn:collaboration> con <bpmn:participant> per pool/lane` : '- Usa <bpmn:process> semplice'}
   ${needsMultiLane ? `- Ogni lane in <bpmn:laneSet> con proprio <bpmn:flowNodeRef>` : ''}
   - ID univoci per tutti gli elementi

2. **ELEMENTI SUPPORTATI:**
   - bpmn:startEvent (inizio processo)
   - bpmn:task (attività manuali)
   - bpmn:serviceTask (attività automatizzate/sistemi)
   - bpmn:userTask (attività utente)
   - bpmn:exclusiveGateway (decisioni, rombi)
   - bpmn:parallelGateway (attività parallele)
   - bpmn:endEvent (fine processo)
   ${needsMultiLane ? `- bpmn:messageFlow per comunicazione tra lane` : ''}

3. **SPECIFICHE GRAFICHE PRECISE:**
   - **Pool**: altezza ${needsMultiLane ? '500-600px' : '300-400px'}
   ${needsMultiLane ? `- **Lane**: altezza ${Math.floor(500 / owners.size)}-${Math.floor(600 / owners.size)}px ciascuna` : ''}
   - **Task**: width="100" height="80"
   - **Gateway**: width="50" height="50"
   - **Event**: width="36" height="36"
   - **Distanza orizzontale tra task**: 180-200px
   - **Margine iniziale**: x="160" per startEvent
   - **Coordinate Y centrali per ogni elemento**

4. **LAYOUT ORIZZONTALE PROFESSIONALE:**
   - Flusso left-to-right
   - StartEvent → Task1 → Gateway? → Task2 → ... → EndEvent
   - Calcola coordinate esatte:
     * StartEvent: x="160" y="[centrato nella lane]"
     * Task1: x="340" y="[centrato]"
     * Task2: x="540" y="[centrato]"
     * Gateway: x="740" y="[centrato]"
     * EndEvent: x="940" y="[centrato]"

5. **WAYPOINTS PRECISI:**
   - Per ogni <bpmndi:BPMNEdge>, calcola waypoints che collegano il centro degli elementi
   - Esempio: Task (x=340, w=100) → centro x=390
   - Gateway (x=540, w=50) → centro x=565
   - Waypoint: <di:waypoint x="390" y="[y-task]" /><di:waypoint x="565" y="[y-gateway]" />

6. **NOMI ITALIANI:**
   - Usa nomi descrittivi in italiano
   - Esempi: "Ricevi richiesta", "Verifica dati", "Invia email", "Decisione: Approvato?"

**FORMATO OUTPUT:**
RISPONDI SOLO CON XML VALIDO, SENZA MARKDOWN O SPIEGAZIONI.

**TEMPLATE BASE:**
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
${needsMultiLane ? `
  <bpmn:collaboration id="Collaboration_1">
    <bpmn:participant id="Participant_1" name="${workflow.titolo}" processRef="Process_1" />
  </bpmn:collaboration>

  <bpmn:process id="Process_1" name="${workflow.titolo}" isExecutable="false">
    <bpmn:laneSet id="LaneSet_1">
${ownersList.map((owner, i) => `      <bpmn:lane id="Lane_${i + 1}" name="${owner}">
        <bpmn:flowNodeRef><!-- Inserisci qui i task di ${owner} --></bpmn:flowNodeRef>
      </bpmn:lane>`).join('\n')}
    </bpmn:laneSet>

    <!-- Elementi del processo -->
    <bpmn:startEvent id="StartEvent_1" name="Inizio">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <!-- ... altri elementi ... -->
  </bpmn:process>` : `
  <bpmn:process id="Process_1" name="${workflow.titolo}" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Inizio">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <!-- ... altri elementi ... -->
  </bpmn:process>`}

  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${needsMultiLane ? 'Collaboration_1' : 'Process_1'}">
${needsMultiLane ? `      <bpmndi:BPMNShape id="Shape_Participant_1" bpmnElement="Participant_1" isHorizontal="true">
        <dc:Bounds x="120" y="80" width="1200" height="600" />
      </bpmndi:BPMNShape>
${ownersList.map((owner, i) => `      <bpmndi:BPMNShape id="Shape_Lane_${i + 1}" bpmnElement="Lane_${i + 1}" isHorizontal="true">
        <dc:Bounds x="150" y="${80 + i * Math.floor(600 / owners.size)}" width="1170" height="${Math.floor(600 / owners.size)}" />
      </bpmndi:BPMNShape>`).join('\n')}
` : ''}
      <!-- Shapes degli elementi con coordinate PRECISE -->
      <bpmndi:BPMNShape id="Shape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="160" y="[calcola y centrale]" width="36" height="36" />
      </bpmndi:BPMNShape>

      <!-- Edges con waypoints PRECISI -->
      <bpmndi:BPMNEdge id="Edge_Flow_1" bpmnElement="Flow_1">
        <di:waypoint x="196" y="[y-start]" />
        <di:waypoint x="340" y="[y-task]" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>

**GENERA ORA IL BPMN XML COMPLETO E PROFESSIONALE:**`;
}

/**
 * Genera BPMN usando AI (Groq)
 */
async function generateBPMNWithAI(prompt: string): Promise<string> {
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
          content: 'Sei un esperto di BPMN 2.0. Generi sempre XML valido senza spiegazioni.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2, // Molto bassa per output preciso
      max_tokens: 5000, // Aumentato per layout complessi e multi-lane
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  let bpmnXml = data.choices[0]?.message?.content || '';

  // Pulisci output (rimuovi markdown code blocks se presenti)
  bpmnXml = bpmnXml.replace(/```xml\n?/g, '').replace(/```\n?/g, '').trim();

  // Valida che sia XML valido
  if (!bpmnXml.includes('<?xml') || !bpmnXml.includes('bpmn:definitions')) {
    throw new Error('AI non ha generato BPMN valido');
  }

  return bpmnXml;
}

/**
 * Fallback: genera BPMN semplice ma VALIDO
 */
function generateSimpleBPMN(workflow: any): string {
  const safeTitle = escapeXml(workflow.titolo || 'Workflow');
  const safeDesc = escapeXml(workflow.descrizione || '');

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" name="${safeTitle}" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Inizio">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>

    <bpmn:task id="Task_1" name="${safeTitle}">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
      <bpmn:documentation>${safeDesc}</bpmn:documentation>
    </bpmn:task>

    <bpmn:endEvent id="EndEvent_1" name="Fine">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>

    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="Shape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="100" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="184" y="143" width="28" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="Shape_Task_1" bpmnElement="Task_1">
        <dc:Bounds x="300" y="78" width="100" height="80" />
      </bpmndi:BPMNShape>

      <bpmndi:BPMNShape id="Shape_EndEvent_1" bpmnElement="EndEvent_1">
        <dc:Bounds x="500" y="100" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="508" y="143" width="20" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <bpmndi:BPMNEdge id="Edge_Flow_1" bpmnElement="Flow_1">
        <di:waypoint x="216" y="118" />
        <di:waypoint x="300" y="118" />
      </bpmndi:BPMNEdge>

      <bpmndi:BPMNEdge id="Edge_Flow_2" bpmnElement="Flow_2">
        <di:waypoint x="400" y="118" />
        <di:waypoint x="500" y="118" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
      maxRequests: 5, // Limitato perché genera XML lungo
      windowMs: 60 * 1000,
    }
  ),
  30000 // 30 secondi timeout
);
