import { Lead, InternalScore } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'franchise_screener_leads';

const defaultScore: InternalScore = {
  capitalStrength: 0,
  businessExperience: 0,
  operationalCapability: 0,
  timelineUrgency: 0,
  decisionPower: 0,
  overallRating: null,
};

export const getLeads = (): Lead[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getLead = (id: string): Lead | undefined => {
  const leads = getLeads();
  return leads.find((l) => l.id === id);
};

export const createLead = (name: string, interviewer?: string): Lead => {
  const leads = getLeads();
  const newLead: Lead = {
    id: uuidv4(),
    name,
    interviewer: interviewer || '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'New',
    answers: {},
    internalScore: { ...defaultScore },
    generalNotes: '',
  };
  // Changed from unshift to push to maintain chronological/CSV order
  leads.push(newLead);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  return newLead;
};

export const updateLead = (lead: Lead): void => {
  const leads = getLeads();
  const index = leads.findIndex((l) => l.id === lead.id);
  if (index !== -1) {
    leads[index] = { ...lead, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }
};

export const deleteLead = (id: string): void => {
  const leads = getLeads();
  const filtered = leads.filter((l) => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};