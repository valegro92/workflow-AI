/**
 * Convert Workflow data to BPMN 2.0 XML
 */

import { Workflow } from '../../types';

/**
 * Generates a simple linear BPMN process from a workflow
 */
export function workflowToBpmn(workflow: Workflow): string {
  const processId = `Process_${workflow.id}`;
  const startEventId = `StartEvent_${workflow.id}`;
  const endEventId = `EndEvent_${workflow.id}`;
  const taskId = `Task_${workflow.id}`;

  // Create BPMN XML structure
  const bpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_${workflow.id}"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${processId}" name="${escapeXml(workflow.titolo)}" isExecutable="false">

    <!-- Start Event -->
    <bpmn:startEvent id="${startEventId}" name="Inizio">
      <bpmn:outgoing>Flow_${startEventId}_${taskId}</bpmn:outgoing>
    </bpmn:startEvent>

    <!-- Main Task -->
    <bpmn:task id="${taskId}" name="${escapeXml(workflow.titolo)}">
      <bpmn:incoming>Flow_${startEventId}_${taskId}</bpmn:incoming>
      <bpmn:outgoing>Flow_${taskId}_${endEventId}</bpmn:outgoing>
      <bpmn:documentation>
Fase: ${escapeXml(workflow.fase)}
Descrizione: ${escapeXml(workflow.descrizione)}
Tempo medio: ${workflow.tempoMedio} minuti
Frequenza: ${workflow.frequenza} volte/mese
Tools: ${workflow.tool.join(', ')}
Input: ${workflow.input.join(', ')}
Output: ${workflow.output.join(', ')}
${workflow.painPoints ? 'Pain Points: ' + escapeXml(workflow.painPoints) : ''}
      </bpmn:documentation>
    </bpmn:task>

    <!-- End Event -->
    <bpmn:endEvent id="${endEventId}" name="Fine">
      <bpmn:incoming>Flow_${taskId}_${endEventId}</bpmn:incoming>
    </bpmn:endEvent>

    <!-- Sequence Flows -->
    <bpmn:sequenceFlow id="Flow_${startEventId}_${taskId}"
                       sourceRef="${startEventId}"
                       targetRef="${taskId}" />
    <bpmn:sequenceFlow id="Flow_${taskId}_${endEventId}"
                       sourceRef="${taskId}"
                       targetRef="${endEventId}" />
  </bpmn:process>

  <!-- Diagram (visual layout) -->
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">

      <!-- Start Event Shape -->
      <bpmndi:BPMNShape id="Shape_${startEventId}" bpmnElement="${startEventId}">
        <dc:Bounds x="160" y="100" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="165" y="143" width="27" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <!-- Task Shape -->
      <bpmndi:BPMNShape id="Shape_${taskId}" bpmnElement="${taskId}">
        <dc:Bounds x="270" y="78" width="100" height="80" />
      </bpmndi:BPMNShape>

      <!-- End Event Shape -->
      <bpmndi:BPMNShape id="Shape_${endEventId}" bpmnElement="${endEventId}">
        <dc:Bounds x="450" y="100" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="459" y="143" width="20" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>

      <!-- Flow 1 Edge -->
      <bpmndi:BPMNEdge id="Edge_Flow1" bpmnElement="Flow_${startEventId}_${taskId}">
        <di:waypoint x="196" y="118" />
        <di:waypoint x="270" y="118" />
      </bpmndi:BPMNEdge>

      <!-- Flow 2 Edge -->
      <bpmndi:BPMNEdge id="Edge_Flow2" bpmnElement="Flow_${taskId}_${endEventId}">
        <di:waypoint x="370" y="118" />
        <di:waypoint x="450" y="118" />
      </bpmndi:BPMNEdge>

    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

  return bpmnXml;
}

/**
 * Generate complete BPMN with multiple workflows as subprocess
 */
export function workflowsToBpmn(workflows: Workflow[]): string {
  if (workflows.length === 0) {
    return generateEmptyBpmn();
  }

  if (workflows.length === 1) {
    return workflowToBpmn(workflows[0]);
  }

  // For multiple workflows, create a process with multiple tasks
  const processId = 'Process_MultiWorkflow';
  const startEventId = 'StartEvent_1';
  const endEventId = 'EndEvent_1';

  let tasks = '';
  let shapes = '';
  let edges = '';
  let flows = '';

  workflows.forEach((workflow, index) => {
    const taskId = `Task_${workflow.id}`;
    const prevId = index === 0 ? startEventId : `Task_${workflows[index - 1].id}`;
    const nextId = index === workflows.length - 1 ? endEventId : `Task_${workflows[index + 1].id}`;
    const flowInId = `Flow_${prevId}_${taskId}`;
    const flowOutId = `Flow_${taskId}_${nextId}`;

    const x = 160 + (index * 150);
    const y = 78;

    tasks += `
    <bpmn:task id="${taskId}" name="${escapeXml(workflow.titolo)}">
      <bpmn:incoming>${flowInId}</bpmn:incoming>
      <bpmn:outgoing>${flowOutId}</bpmn:outgoing>
      <bpmn:documentation>
Fase: ${escapeXml(workflow.fase)}
Tempo: ${workflow.tempoMedio} min x ${workflow.frequenza}/mese
      </bpmn:documentation>
    </bpmn:task>
`;

    flows += `
    <bpmn:sequenceFlow id="${flowInId}" sourceRef="${prevId}" targetRef="${taskId}" />
`;

    shapes += `
      <bpmndi:BPMNShape id="Shape_${taskId}" bpmnElement="${taskId}">
        <dc:Bounds x="${x}" y="${y}" width="100" height="80" />
      </bpmndi:BPMNShape>
`;

    edges += `
      <bpmndi:BPMNEdge id="Edge_${flowInId}" bpmnElement="${flowInId}">
        <di:waypoint x="${x - 40}" y="118" />
        <di:waypoint x="${x}" y="118" />
      </bpmndi:BPMNEdge>
`;

    // Last workflow connects to end event
    if (index === workflows.length - 1) {
      flows += `
    <bpmn:sequenceFlow id="${flowOutId}" sourceRef="${taskId}" targetRef="${endEventId}" />
`;
      edges += `
      <bpmndi:BPMNEdge id="Edge_${flowOutId}" bpmnElement="${flowOutId}">
        <di:waypoint x="${x + 100}" y="118" />
        <di:waypoint x="${x + 140}" y="118" />
      </bpmndi:BPMNEdge>
`;
    }
  });

  const endX = 160 + (workflows.length * 150);

  const bpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_MultiWorkflow"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${processId}" name="Workflow Sequence" isExecutable="false">

    <bpmn:startEvent id="${startEventId}" name="Inizio">
      <bpmn:outgoing>Flow_${startEventId}_Task_${workflows[0].id}</bpmn:outgoing>
    </bpmn:startEvent>

    ${tasks}

    <bpmn:endEvent id="${endEventId}" name="Fine">
      <bpmn:incoming>Flow_Task_${workflows[workflows.length - 1].id}_${endEventId}</bpmn:incoming>
    </bpmn:endEvent>

    ${flows}
  </bpmn:process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">

      <bpmndi:BPMNShape id="Shape_${startEventId}" bpmnElement="${startEventId}">
        <dc:Bounds x="80" y="100" width="36" height="36" />
      </bpmndi:BPMNShape>

      ${shapes}

      <bpmndi:BPMNShape id="Shape_${endEventId}" bpmnElement="${endEventId}">
        <dc:Bounds x="${endX}" y="100" width="36" height="36" />
      </bpmndi:BPMNShape>

      ${edges}

    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

  return bpmnXml;
}

/**
 * Generate empty BPMN template
 */
function generateEmptyBpmn(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_Empty"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Empty" name="Empty Process" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_1</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_Empty">
      <bpmndi:BPMNShape id="Shape_Start" bpmnElement="StartEvent_1">
        <dc:Bounds x="160" y="100" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Shape_End" bpmnElement="EndEvent_1">
        <dc:Bounds x="300" y="100" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Edge_Flow1" bpmnElement="Flow_1">
        <di:waypoint x="196" y="118" />
        <di:waypoint x="300" y="118" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
