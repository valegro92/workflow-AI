/**
 * BPMN 2.0 Types for Workflow AI Analyzer
 */

export interface BPMNElement {
  id: string;
  type: 'task' | 'gateway' | 'startEvent' | 'endEvent' | 'sequenceFlow';
  name: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface BPMNTask extends BPMNElement {
  type: 'task';
  taskType?: 'user' | 'service' | 'manual';
}

export interface BPMNGateway extends BPMNElement {
  type: 'gateway';
  gatewayType: 'exclusive' | 'parallel' | 'inclusive';
}

export interface BPMNEvent extends BPMNElement {
  type: 'startEvent' | 'endEvent';
}

export interface BPMNFlow extends BPMNElement {
  type: 'sequenceFlow';
  sourceRef: string;
  targetRef: string;
}

export interface BPMNDiagram {
  id: string;
  name: string;
  processId: string;
  elements: BPMNElement[];
  bpmnXml: string;
  metadata: {
    workflowId: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface BPMNModelerOptions {
  container: HTMLElement;
  width?: string | number;
  height?: string | number;
  keyboard?: {
    bindTo: Document | HTMLElement;
  };
}
