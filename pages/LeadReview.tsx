import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLead, updateLead } from '../services/storage';
import { analyzeLead } from '../services/geminiService';
import { fetchCityInsights } from '../services/groqService';
import { Lead, InternalScore, Grade, NextStep } from '../types';
import { SECTIONS } from '../constants';
import { Save, ArrowLeft, Bot, Sparkles, Loader2, Download, Filter, CheckCircle2, FileText, Calendar, Phone, MapPin, Briefcase, AlertCircle, Clock, Map, Globe, User } from 'lucide-react';

const GRADES: Grade[] = ['A+', 'A', 'B+', 'B', 'C', 'D'];

const LeadReview: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'scoring'>('details');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  
  // Next Step State
  const [nextStepStatus, setNextStepStatus] = useState<NextStep['status']>('Follow Up');
  const [nextStepDate, setNextStepDate] = useState('');
  const [nextStepNotes, setNextStepNotes] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  useEffect(() => {
    if (leadId) {
      const found = getLead(leadId);
      if (found) {
        setLead(found);
        setGeneralNotes(found.generalNotes || '');
        if (found.nextStep) {
          setNextStepStatus(found.nextStep.status);
          setNextStepNotes(found.nextStep.notes || '');
          setNextStepDate(found.nextStep.date || '');
        }
      } else navigate('/');
    }
  }, [leadId, navigate]);

  if (!lead) return null;

  const handleAnswerChange = (qId: string, value: string) => {
    const updatedLead = {
      ...lead,
      answers: {
        ...lead.answers,
        [qId]: {
          ...lead.answers[qId],
          questionId: qId,
          answer: value,
          skipped: false
        }
      }
    };
    setLead(updatedLead);
  };

  const handleScoreChange = (field: keyof InternalScore, value: any) => {
    const updatedLead = {
      ...lead,
      internalScore: {
        ...lead.internalScore,
        [field]: value
      }
    };
    setLead(updatedLead);
  };

  const saveChanges = () => {
    setIsSaving(true);
    
    // Save Next Step info & General Notes
    const updatedLead = {
      ...lead,
      generalNotes,
      nextStep: {
        status: nextStepStatus,
        date: nextStepDate,
        notes: nextStepNotes
      }
    };

    setLead(updatedLead);
    updateLead(updatedLead);
    setTimeout(() => setIsSaving(false), 500);
  };

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeLead(lead);
    if (result) {
      const updatedLead = {
        ...lead,
        internalScore: {
          ...result.scores,
          aiSummary: result.summary
        }
      };
      setLead(updatedLead);
      updateLead(updatedLead);
      setActiveTab('scoring');
    } else {
      alert("AI Analysis failed. Please check your API key.");
    }
    setIsAnalyzing(false);
  };

  const runLocationAnalysis = async () => {
    const city = lead.answers['q_city']?.answer || lead.answers['q_city']?.importedAnswer;
    if (!city) {
      alert("No city found in candidate profile (Section 1).");
      return;
    }
    
    setIsLocating(true);
    const insights = await fetchCityInsights(city);
    
    if (insights) {
      const updatedLead = {
        ...lead,
        cityInsights: insights
      };
      setLead(updatedLead);
      updateLead(updatedLead);
    } else {
      alert("Location analysis failed. Please check your Groq API Key.");
    }
    setIsLocating(false);
  };

  const exportCSV = () => {
    const headers = ['Section', 'Question', 'Selected', 'Answer'];
    const rows: string[][] = [];
    
    SECTIONS.forEach(section => {
        section.questions.forEach(q => {
            const ans = lead.answers[q.id];
            if (ans?.selected || (ans?.answer && ans.answer.trim().length > 0)) {
                rows.push([
                    `"${section.title.replace('Section ', '')}"`,
                    `"${q.text.replace(/"/g, '""')}"`,
                    ans?.selected ? 'Yes' : 'No',
                    `"${(ans?.answer || '').replace(/"/g, '""')}"`
                ]);
            }
        });
    });

    if (generalNotes) {
      rows.push(['Notes', 'General Session Notes', 'Yes', `"${generalNotes.replace(/"/g, '""')}"`]);
    }

    if (lead.cityInsights) {
       rows.push(['Location', 'Groq Location Analysis', '-', `"${lead.cityInsights.replace(/"/g, '""')}"`]);
    }
    
    if (lead.nextStep) {
      rows.push(['Next Step', 'Status', '-', lead.nextStep.status]);
      rows.push(['Next Step', 'Date', '-', lead.nextStep.date || '']);
      rows.push(['Next Step', 'Notes', '-', lead.nextStep.notes || '']);
    }

    if (lead.interviewer) {
      rows.push(['Session Info', 'Interviewer', '-', lead.interviewer]);
    }

    if (rows.length === 0) {
        alert("No answers recorded to export.");
        return;
    }

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${lead.name.replace(/\s+/g, '_')}_screening.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (val: number) => {
    if (val >= 4) return 'bg-white dark:bg-neutral-800 text-indigo-900 dark:text-white border-indigo-900 dark:border-neutral-500 font-bold';
    if (val === 3) return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700';
    return 'bg-neutral-50 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 border-neutral-200 dark:border-neutral-800';
  };

  const getGradeStyle = (grade: Grade, isSelected: boolean) => {
    if (isSelected) {
       switch (grade) {
         case 'A+':
         case 'A': return 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/30';
         case 'B+':
         case 'B': return 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30';
         case 'C': return 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/30';
         case 'D': return 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-500/30';
         default: return 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white shadow-lg';
       }
    }
    return 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-600 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400';
  };

  const nextStepOptions: { value: NextStep['status'], label: string, icon: React.ReactNode, activeClass: string }[] = [
    { value: 'Meeting Fixed', label: 'Meeting Fixed', icon: <Calendar className="w-4 h-4"/>, activeClass: 'bg-purple-600 text-white border-purple-600' },
    { value: 'Call Back', label: 'Call Back', icon: <Phone className="w-4 h-4"/>, activeClass: 'bg-blue-600 text-white border-blue-600' },
    { value: 'Manager Reach Out', label: 'Manager Escalation', icon: <Briefcase className="w-4 h-4"/>, activeClass: 'bg-amber-600 text-white border-amber-600' },
    { value: 'Physical Visit', label: 'Physical Visit', icon: <MapPin className="w-4 h-4"/>, activeClass: 'bg-emerald-600 text-white border-emerald-600' },
    { value: 'Follow Up', label: 'General Follow Up', icon: <Clock className="w-4 h-4"/>, activeClass: 'bg-indigo-600 text-white border-indigo-600' },
    { value: 'Closed', label: 'Close / Reject', icon: <AlertCircle className="w-4 h-4"/>, activeClass: 'bg-red-600 text-white border-red-600' },
  ];

  return (
    <div className="pb-24 font-sans">
      {/* Optimized Mobile Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800 mb-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <button 
            onClick={() => navigate('/')} 
            className="flex-shrink-0 flex items-center text-neutral-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium p-2 -ml-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
            title="Dashboard"
          >
            <ArrowLeft className="w-5 h-5 md:mr-2" /> 
            <span className="hidden md:inline">Dashboard</span>
          </button>
          
          <div className="flex-1 flex items-center justify-end gap-2 overflow-x-auto no-scrollbar mask-linear-fade">
             {/* Secondary Actions Group */}
            <div className="flex items-center gap-2 mr-2 pr-4 border-r border-neutral-300 dark:border-neutral-700">
               <button 
                  onClick={() => setShowSelectedOnly(!showSelectedOnly)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap
                    ${showSelectedOnly ? 'bg-indigo-900 dark:bg-indigo-100 text-white dark:text-indigo-900' : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'}
                  `}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">{showSelectedOnly ? 'Selected Only' : 'All Questions'}</span>
                  <span className="sm:hidden">{showSelectedOnly ? 'Selected' : 'All'}</span>
                </button>
                
                <button 
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs sm:text-sm font-medium whitespace-nowrap"
                >
                  <Download className="w-4 h-4" /> 
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
            </div>

            {/* Primary Actions Group */}
            {process.env.API_KEY && (
              <button 
                onClick={runAIAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-70 shadow-sm text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors"
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span className="hidden sm:inline">Analyze</span>
              </button>
            )}
            
            {/* Groq Location Button - Always visible now if integrated */}
            <button 
              onClick={runLocationAnalysis}
              disabled={isLocating}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 disabled:opacity-70 shadow-sm text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors"
            >
              {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Map className="w-4 h-4" />}
              <span className="hidden sm:inline">Location</span>
            </button>

            <button 
              onClick={saveChanges}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-400 disabled:opacity-70 shadow-md text-xs sm:text-sm font-bold whitespace-nowrap justify-center transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save'}
              {!isSaving && <Save className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden min-h-[500px]">
        {/* Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
           <button 
             onClick={() => setActiveTab('details')}
             className={`flex-1 py-3 sm:py-4 text-center font-bold text-xs sm:text-sm tracking-wide border-b-2 transition-all ${activeTab === 'details' ? 'border-indigo-600 dark:border-indigo-400 text-indigo-900 dark:text-white bg-white dark:bg-neutral-900' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
           >
             Responses
           </button>
           <button 
             onClick={() => setActiveTab('scoring')}
             className={`flex-1 py-3 sm:py-4 text-center font-bold text-xs sm:text-sm tracking-wide border-b-2 transition-all ${activeTab === 'scoring' ? 'border-indigo-600 dark:border-indigo-400 text-indigo-900 dark:text-white bg-white dark:bg-neutral-900' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
           >
             Scorecard & Next Steps
           </button>
        </div>

        <div className="p-4 sm:p-8">
          {activeTab === 'details' ? (
            <div className="space-y-8 sm:space-y-12">
              
              {/* Session Info Block (New) */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                 <div className="flex-1 flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-800">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-lg">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium uppercase tracking-wide">Candidate</p>
                      <p className="font-bold text-neutral-900 dark:text-white">{lead.name}</p>
                    </div>
                 </div>
                 
                 {lead.interviewer && (
                   <div className="flex-1 flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-800">
                      <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium uppercase tracking-wide">Interviewer</p>
                        <p className="font-bold text-neutral-900 dark:text-white">{lead.interviewer}</p>
                      </div>
                   </div>
                 )}
              </div>

              {/* Location Context Card */}
              {lead.cityInsights && (
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 sm:p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden mb-8 animate-in fade-in slide-in-from-top-4">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Globe className="w-24 h-24 dark:text-white" />
                  </div>
                  <div className="flex items-center gap-2 mb-3 sm:mb-4 text-emerald-900 dark:text-emerald-300 font-bold text-lg">
                    <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Location Intelligence
                  </div>
                  <div className="text-neutral-700 dark:text-neutral-300 leading-relaxed text-sm sm:text-base relative z-10 whitespace-pre-line">
                    {lead.cityInsights}
                  </div>
                </div>
              )}

              {/* General Session Notes - Moved to Top */}
              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 mb-8">
                 <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">General Session Notes</h3>
                 <textarea
                   rows={4}
                   value={generalNotes}
                   onChange={(e) => setGeneralNotes(e.target.value)}
                   className="w-full p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20 focus:border-indigo-600 dark:focus:border-indigo-400 outline-none text-neutral-900 dark:text-white resize-none text-sm sm:text-base transition-all"
                   placeholder="Add any free-form notes, impressions, or extra details about the candidate here..."
                 />
              </div>

              {SECTIONS.map((section) => {
                const sectionQuestions = showSelectedOnly 
                   ? section.questions.filter(q => lead.answers[q.id]?.selected)
                   : section.questions;

                if (sectionQuestions.length === 0) return null;

                return (
                  <div key={section.id} className="border-b border-neutral-100 dark:border-neutral-800 pb-8 sm:pb-10 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                      <div className="h-6 sm:h-8 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
                      <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">{section.title}</h3>
                    </div>
                    
                    <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                      {sectionQuestions.map((q) => {
                        const isSelected = lead.answers[q.id]?.selected;
                        return (
                          <div 
                             key={q.id} 
                             className={`group p-4 sm:p-5 rounded-xl border transition-all duration-200
                               ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 shadow-sm' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'}
                             `}
                          >
                            <div className="flex justify-between items-start mb-3 gap-2">
                               <label className={`block text-sm font-bold leading-relaxed ${isSelected ? 'text-indigo-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                                 {q.text}
                               </label>
                               {isSelected && (
                                 <span className="flex-shrink-0 flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 shadow-sm">
                                   <CheckCircle2 className="w-3 h-3" /> Selected
                                 </span>
                               )}
                            </div>
                            <textarea
                              rows={2}
                              value={lead.answers[q.id]?.answer || ''}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20 focus:border-indigo-600 dark:focus:border-indigo-400 outline-none text-sm transition-all
                                ${isSelected ? 'bg-white dark:bg-neutral-900 border-indigo-200 dark:border-indigo-800 text-neutral-900 dark:text-white' : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 focus:bg-white dark:focus:bg-neutral-900 text-neutral-800 dark:text-neutral-300'}
                              `}
                              placeholder={isSelected ? "Enter candidate's answer..." : "Not asked"}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {showSelectedOnly && SECTIONS.every(s => s.questions.filter(q => lead.answers[q.id]?.selected).length === 0) && (
                  <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-neutral-400 dark:text-neutral-600">
                      <FileText className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-medium text-sm sm:text-base">No questions were marked as selected.</p>
                      <button onClick={() => setShowSelectedOnly(false)} className="text-indigo-600 dark:text-indigo-400 hover:underline mt-2 text-sm font-medium">Show all questions</button>
                  </div>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-8 sm:space-y-12">
               {lead.internalScore.aiSummary && (
                 <div className="bg-purple-50 dark:bg-purple-900/10 p-4 sm:p-6 rounded-2xl border border-purple-100 dark:border-purple-800 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                       <Bot className="w-24 h-24 dark:text-white" />
                    </div>
                    <div className="flex items-center gap-2 mb-2 sm:mb-3 text-purple-900 dark:text-purple-300 font-bold text-lg">
                       <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" /> AI Executive Summary
                    </div>
                    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed text-sm sm:text-base relative z-10">{lead.internalScore.aiSummary}</p>
                 </div>
               )}

               <div>
                 <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4 flex flex-col sm:flex-row sm:items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                   Detailed Scoring
                   <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full sm:ml-auto w-fit">Scale: 1 (Weak) - 5 (Strong)</span>
                 </h3>
                 <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                    {[
                      { key: 'capitalStrength', label: 'Capital Strength' },
                      { key: 'businessExperience', label: 'Business Experience' },
                      { key: 'operationalCapability', label: 'Operational Capability' },
                      { key: 'timelineUrgency', label: 'Timeline Urgency' },
                      { key: 'decisionPower', label: 'Decision Power' },
                    ].map((metric) => (
                      <div key={metric.key} className="bg-white dark:bg-neutral-900 p-4 sm:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
                         <div className="flex justify-between items-center mb-4">
                            <label className="font-bold text-sm sm:text-base text-neutral-800 dark:text-neutral-200">{metric.label}</label>
                            <span className={`px-3 py-1 rounded-md text-sm border ${getScoreColor(lead.internalScore[metric.key as keyof InternalScore] as number)}`}>
                              {lead.internalScore[metric.key as keyof InternalScore] || 0}
                            </span>
                         </div>
                         <input 
                           type="range" 
                           min="1" 
                           max="5" 
                           step="1"
                           value={lead.internalScore[metric.key as keyof InternalScore] as number || 0}
                           onChange={(e) => handleScoreChange(metric.key as keyof InternalScore, parseInt(e.target.value))}
                           className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500"
                         />
                         <div className="flex justify-between text-xs text-neutral-400 dark:text-neutral-500 mt-2 font-bold uppercase tracking-wider">
                           <span>Weak</span>
                           <span>Strong</span>
                         </div>
                      </div>
                    ))}
                 </div>
               </div>

               <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-2">Post-Interview Action</h3>
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 sm:p-6 space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                        {nextStepOptions.map(opt => (
                           <button
                             key={opt.value}
                             onClick={() => setNextStepStatus(opt.value)}
                             className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all gap-2
                               ${nextStepStatus === opt.value 
                                  ? `${opt.activeClass} shadow-md` 
                                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600'}
                             `}
                           >
                              {opt.icon}
                              <span className="text-[10px] sm:text-xs font-bold text-center leading-tight">{opt.label}</span>
                           </button>
                        ))}
                      </div>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Date & Time</label>
                            <input 
                              type="datetime-local"
                              value={nextStepDate}
                              onChange={(e) => setNextStepDate(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20 focus:border-indigo-600 dark:focus:border-indigo-400 outline-none dark:text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Notes</label>
                            <input 
                              type="text"
                              value={nextStepNotes}
                              onChange={(e) => setNextStepNotes(e.target.value)}
                              placeholder="e.g. Discuss financials..."
                              className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20 focus:border-indigo-600 dark:focus:border-indigo-400 outline-none dark:text-white text-sm"
                            />
                          </div>
                      </div>
                  </div>
               </div>

               <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-6 text-center">Final Assessment Grade</h3>
                  <div className="grid grid-cols-3 sm:flex sm:justify-center gap-3">
                    {GRADES.map((grade) => {
                      const isSelected = lead.internalScore.overallRating === grade;
                      return (
                        <button
                          key={grade}
                          onClick={() => handleScoreChange('overallRating', grade)}
                          className={`
                            h-12 w-full sm:w-16 sm:h-16 rounded-xl font-bold text-lg sm:text-xl flex items-center justify-center transition-all duration-200 border-2
                            ${getGradeStyle(grade, isSelected)}
                            ${isSelected ? 'scale-105 sm:scale-110 z-10' : 'hover:-translate-y-1'}
                          `}
                        >
                          {grade}
                        </button>
                      );
                    })}
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadReview;