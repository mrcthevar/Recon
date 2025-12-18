export interface Company {
  id: string;
  name: string;
  website: string;
  industry: string;
  status: 'New' | 'Warm' | 'Contacted';
  description: string;
  recentWork: string;
  needs: string[];
  heroProduct: string;
  phone: string;
  email: string;
}

export interface ScoutData {
  company: Company | null;
  pitch: string | null;
}

export interface PitchParams {
  companyName: string;
  industry: string;
  userSkills: string;
  tone: 'Professional' | 'Casual' | 'Bold';
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