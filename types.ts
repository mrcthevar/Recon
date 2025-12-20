

export interface Signal {
  type: string;
  text: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface Job {
  id: string;
  title: string;
  location: string;
  type: string;
  salary?: string;
  link?: string;
  status?: 'Saved' | 'Applied' | 'Interviewing' | 'Offer';
  notes?: string;
}

export interface SavedJob extends Job {
  companyName: string;
  companyId: string;
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
  openRoles?: Job[];
  hiringCulture?: string;
}

export interface Source {
  title: string;
  uri: string;
}

export interface SearchResult {
  leads: Company[];
  sources: Source[];
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
  companySignals?: string[]; 
  format?: 'email' | 'linkedin_connect' | 'linkedin_inmail';
  context?: 'sales' | 'job_application'; // New context
  jobTitle?: string; // Specific job context
}

export type SearchMode = 'discovery' | 'lookup' | 'jobs';

export interface SearchParams {
  mode: SearchMode;
  industry?: string; // Used as Role in 'jobs' mode
  city: string;
  companyName?: string;
  excludeNames?: string[];
  role?: string; // Explicit role field
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