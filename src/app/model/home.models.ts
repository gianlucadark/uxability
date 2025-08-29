export interface ViolationNode {
  target: string[];
  failureSummary: string;
  showTechnical?: boolean;
  html?: string;
  uniqueId?: string;
  screenshot?: string;
}

export interface Violation {
  id: string;
  impact: string;
  description: string;
  help: string;
  nodes: ViolationNode[];
  solution?: string;
  showDetails?: boolean;
  wcag?: string[];
  translatedDescription?: string;
  translatedSolution?: string;
  translatedFailureSummary?: string;
  technicalFailureSummary?: string;
  aiExplanation?: string;
}

export interface ViolationGroup {
  impact: string;
  translatedImpact: string;
  violations: Violation[];
  isExpanded: boolean;
}

export interface ScanResults {
  violations?: Violation[];
  error?: string;
  passes?: any[];
  incomplete?: any[];
  inapplicable?: any[];
  screenshot?: string;
}

export type ImpactLevel = 'critical' | 'serious' | 'moderate' | 'minor';
