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
  };
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
    const prompt = buildBPMNPrompt(workflow);

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
 * Costruisce prompt per AI
 */
function buildBPMNPrompt(workflow: any): string {
  return `Sei un esperto di BPMN 2.0. Genera un diagramma BPMN XML valido e COMPLESSO basato su questo workflow:

Titolo: ${workflow.titolo}
Descrizione: ${workflow.descrizione}
${workflow.tool ? `Tool usati: ${workflow.tool.join(', ')}` : ''}
${workflow.input ? `Input: ${workflow.input.join(', ')}` : ''}
${workflow.output ? `Output: ${workflow.output.join(', ')}` : ''}
${workflow.painPoints ? `Pain Points: ${workflow.painPoints}` : ''}

REQUISITI IMPORTANTI:
1. Analizza la descrizione e identifica gli step reali del processo
2. Usa elementi BPMN appropriati:
   - bpmn:task per attività manuali
   - bpmn:serviceTask per automazioni
   - bpmn:exclusiveGateway per decisioni (rombi)
   - bpmn:parallelGateway per attività parallele
   - bpmn:subProcess se ci sono sotto-processi
3. Crea un diagramma REALISTICO con 5-10 elementi
4. Layout orizzontale left-to-right
5. Coordinate valide (x: 100-1500, y: 50-400)
6. Ogni elemento deve avere dimensioni standard:
   - startEvent/endEvent: 36x36
   - task: 100x80
   - gateway: 50x50
7. Waypoints delle edges devono collegare correttamente gli elementi

FORMATO OUTPUT:
Restituisci SOLO il codice XML BPMN 2.0 completo, senza spiegazioni.
Includi sia la sezione <bpmn:process> che <bpmndi:BPMNDiagram>.
Usa nomi descrittivi italiani per gli elementi.

ESEMPIO STRUTTURA (espandi basandoti sul workflow):
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions ...>
  <bpmn:process id="Process_1" name="${workflow.titolo}">
    <bpmn:startEvent id="StartEvent_1" name="Inizio">
      <bpmn:outgoing>Flow1</bpmn:outgoing>
    </bpmn:startEvent>

    <!-- Aggiungi task, gateway, ecc. basati sulla descrizione -->

    <bpmn:endEvent id="EndEvent_1" name="Fine">
      <bpmn:incoming>FlowN</bpmn:incoming>
    </bpmn:endEvent>

    <!-- Sequence flows -->
  </bpmn:process>

  <bpmndi:BPMNDiagram>
    <bpmndi:BPMNPlane bpmnElement="Process_1">
      <!-- Shapes e Edges con coordinate valide -->
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>

Genera il BPMN XML ora:`;
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
      temperature: 0.3, // Bassa per output strutturato
      max_tokens: 3000,
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
