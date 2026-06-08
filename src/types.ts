export interface HistoryRecord {
  id: string;
  projectName: string;
  time: string;
  timestamp: number;
  module: string;
  score: string | number;
  verdict: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export interface ComplianceItem {
  name: string;
  regulationName: string;
  status: 'COMPLIANT' | 'NON-COMPLIANT';
  ruleDescription: string;
  actionRequired: string;
}
