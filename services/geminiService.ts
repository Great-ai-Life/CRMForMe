import { GoogleGenAI, Type } from "@google/genai";
import { Lead, Question } from '../types';
import { SECTIONS } from '../constants';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeLead = async (lead: Lead): Promise<{
  summary: string;
  scores: {
    capitalStrength: number;
    businessExperience: number;
    operationalCapability: number;
    timelineUrgency: number;
    decisionPower: number;
    overallRating: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  }
} | null> => {
  const ai = getClient();
  if (!ai) return null;

  // Construct a transcript from the QA
  let transcript = `Candidate Name: ${lead.name}\n\n`;
  
  SECTIONS.forEach(section => {
    transcript += `SECTION: ${section.title}\n`;
    section.questions.forEach(q => {
      const answer = lead.answers[q.id]?.answer;
      if (answer) {
        transcript += `Q: ${q.text}\nA: ${answer}\n`;
      }
    });
    transcript += '\n';
  });

  const prompt = `
    You are an expert franchise consultant analyzing a potential investor interview.
    Based on the following interview transcript, provide a concise professional summary and rate the candidate on specific metrics (1-5 scale) and an overall grade (A+, A, B+, B, C, D).
    
    Transcript:
    ${transcript}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "A 2-3 sentence professional summary of the candidate's fit." },
            scores: {
              type: Type.OBJECT,
              properties: {
                capitalStrength: { type: Type.INTEGER, description: "1-5 rating on financial capacity" },
                businessExperience: { type: Type.INTEGER, description: "1-5 rating on past business experience" },
                operationalCapability: { type: Type.INTEGER, description: "1-5 rating on ability to run operations" },
                timelineUrgency: { type: Type.INTEGER, description: "1-5 rating on readiness to start" },
                decisionPower: { type: Type.INTEGER, description: "1-5 rating on authority to make the decision" },
                overallRating: { type: Type.STRING, description: "Grade: A+, A, B+, B, C, or D" },
              },
              required: ['capitalStrength', 'businessExperience', 'operationalCapability', 'timelineUrgency', 'decisionPower', 'overallRating']
            }
          },
          required: ['summary', 'scores']
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini analysis failed", error);
    return null;
  }
};
