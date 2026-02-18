export interface Question {
  id: string;
  text: string;
  category: string;
}

export interface Section {
  id: string;
  title: string;
  questions: Question[];
}

export type Grade = 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';

export interface InternalScore {
  capitalStrength: number; // 1-5
  businessExperience: number; // 1-5
  operationalCapability: number; // 1-5
  timelineUrgency: number; // 1-5
  decisionPower: number; // 1-5
  overallRating: Grade | null;
  aiSummary?: string;
}

export interface SavedAnswer {
  questionId: string;
  answer: string;
  importedAnswer?: string; // Data from CSV/Excel, shown as context but not saved until confirmed
  skipped: boolean; 
  selected?: boolean; // True if the user explicitly chose to ask this question during the call
}

export interface NextStep {
  status: 'Meeting Fixed' | 'Call Back' | 'Manager Reach Out' | 'Physical Visit' | 'Follow Up' | 'Hold' | 'Closed';
  date?: string; // ISO date string
  notes?: string;
}

export interface Lead {
  id: string;
  name: string;
  interviewer?: string; // The person conducting the screening
  createdAt: number;
  updatedAt: number;
  status: 'New' | 'In Progress' | 'Review' | 'Qualified' | 'Disqualified';
  answers: Record<string, SavedAnswer>; // Map questionId to Answer
  internalScore: InternalScore;
  nextStep?: NextStep;
  generalNotes?: string; // Free text notes for the entire session
  cityInsights?: string; // Groq AI analysis of the location
}