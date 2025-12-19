
export interface Signal {
  type: string;
  text: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface Company {
  id: string;
  name: string;
  website: string;
  industry: string;
  status: 'New' | 'Saved' | 'Contacted';
  description: string;
  recentWork: string;
  needs: string[];
  heroProduct: string;
  phone: string;
  email: string;
  socials: string;
  hotScore: number;
  scoreReasoning?: string;
  signals: Signal[];
  location: string;
}

export interface Pitch {
  angle: string;
  subject: string;
  body: string;
}

export interface PitchParams {
  companyName: string;
  industry: string;
  userSkills: string;
  tone: 'Professional' | 'Casual' | 'Bold';
  companySignals?: string[]; // New: Pass signals to context
}

export type SearchMode = 'discovery' | 'lookup';

export interface SearchParams {
  mode: SearchMode;
  industry?: string;
  city: string;
  companyName?: string;
  excludeNames?: string[];
}

export interface FileData {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export interface AnalysisResult {
  text: string;
  timestamp: string;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}
