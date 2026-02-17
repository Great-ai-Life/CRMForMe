import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLead, updateLead } from '../services/storage';
import { Lead } from '../types';
import { SECTIONS } from '../constants';
import { ChevronLeft, CheckCircle2, Circle, ArrowRight, X, PenLine, Sparkles, Copy, Lightbulb } from 'lucide-react';

const ScreeningSession: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | undefined>(undefined);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [tempAnswer, setTempAnswer] = useState('');
  const [showInsight, setShowInsight] = useState(true);

  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (leadId) {
      const found = getLead(leadId);
      if (found) {
        setLead(found);
        if (found.status === 'New') {
          updateLead({ ...found, status: 'In Progress' });
        }
      } else {
        navigate('/');
      }
    }
  }, [leadId, navigate]);

  useEffect(() => {
    if (activeQuestionId && questionInputRef.current) {
      questionInputRef.current.focus();
    }
    setShowInsight(true);
  }, [activeQuestionId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo(0, 0);
    }
  }, [activeSectionIndex]);

  if (!lead) return null;

  const currentSection = SECTIONS[activeSectionIndex];

  const handleSelectQuestion = (qId: string) => {
    const existing = lead.answers[qId]?.answer || '';
    setTempAnswer(existing);
    setActiveQuestionId(qId);
  };

  const saveAnswer = (qId: string, text: string, moveNext: boolean) => {
    if (!lead) return;
    
    const updatedAnswers = {
      ...lead.answers,
      [qId]: {
        ...lead.answers[qId], 
        questionId: qId,
        answer: text,
        skipped: false,
        selected: true 
      }
    };
    
    const updatedLead = { ...lead, answers: updatedAnswers };
    setLead(updatedLead);
    updateLead(updatedLead);

    setActiveQuestionId(null);
    setTempAnswer('');

    if (moveNext) {
      setTimeout(() => {
        nextSection();
      }, 100); 
    }
  };

  const handleConfirmAndNext = () => {
    if (activeQuestionId) {
      saveAnswer(activeQuestionId, tempAnswer, true);
    }
  };

  const handleSaveAndStay = () => {
    if (activeQuestionId) {
      saveAnswer(activeQuestionId, tempAnswer, false);
    }
  };

  const nextSection = () => {
    if (activeSectionIndex < SECTIONS.length - 1) {
      setActiveSectionIndex(prev => prev + 1);
    } else {
      updateLead({ ...lead, status: 'Review' });
      navigate(`/review/${lead.id}`);
    }
  };

  const prevSection = () => {
    if (activeSectionIndex > 0) {
      setActiveSectionIndex(prev => prev - 1);
      setActiveQuestionId(null);
    }
  };

  const progressPercent = ((activeSectionIndex + 1) / SECTIONS.length) * 100;
  const isLastSection = activeSectionIndex === SECTIONS.length - 1;

  const activeAnswerObj = activeQuestionId ? lead.answers[activeQuestionId] : null;
  const importedData = activeAnswerObj?.importedAnswer;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] relative">
      {/* Header / Progress */}
      <div className="mb-4 flex-none px-1">
        <div className="flex items-center justify-between mb-3">
           <h2 className="text-xl font-bold text-neutral-900 dark:text-white truncate pr-2">
             <span className="text-neutral-400 dark:text-neutral-500 font-medium mr-2 text-base">Sec {activeSectionIndex + 1}</span>
             {currentSection.title.replace(/Section \d+: /, '')}
           </h2>
           <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-full whitespace-nowrap border border-neutral-200 dark:border-neutral-700">
             {activeSectionIndex + 1} / {SECTIONS.length}
           </span>
        </div>
        <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-black dark:bg-white h-1.5 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div ref={listRef} className="flex-1 overflow-y-auto pb-48 scroll-smooth px-1">
        <p className="text-xs font-bold text-neutral-400 dark:text-neutral-600 mb-4 uppercase tracking-wider pl-1">
          Tap Question to Select
        </p>
        <div className="space-y-3">
          {currentSection.questions.map(q => {
            const answerObj = lead.answers[q.id];
            const isSelected = answerObj?.selected;
            const hasAnswerText = answerObj?.answer && answerObj.answer.length > 0;
            const hasImportedData = !!answerObj?.importedAnswer;
            const isActive = activeQuestionId === q.id;

            return (
              <button
                key={q.id}
                onClick={() => handleSelectQuestion(q.id)}
                className={`w-full text-left p-5 rounded-xl border transition-all duration-200 relative group
                  ${isActive 
                    ? 'bg-neutral-50 dark:bg-neutral-900 border-black dark:border-white ring-1 ring-black dark:ring-white shadow-md z-10' 
                    : (isSelected ? 'bg-neutral-50 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 hover:shadow-sm')
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 min-w-[24px] transition-colors
                     ${isActive ? 'text-black dark:text-white' : (isSelected ? 'text-emerald-500' : 'text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-400')}
                  `}>
                    {(isActive || isSelected) ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-2">
                       <p className={`font-medium text-lg leading-snug transition-colors ${isActive ? 'text-neutral-900 dark:text-white' : (isSelected ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-600 dark:text-neutral-400')}`}>
                         {q.text}
                       </p>
                       {hasImportedData && !isActive && !hasAnswerText && (
                         <span className="shrink-0 text-amber-500 animate-pulse">
                           <Lightbulb className="w-4 h-4" />
                         </span>
                       )}
                    </div>
                    {hasAnswerText && !isActive && (
                      <div className="mt-2 flex items-start gap-2">
                        <PenLine className="w-3 h-3 text-neutral-400 dark:text-neutral-500 mt-1" />
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
                          "{answerObj.answer}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Bar or Input Overlay */}
      {activeQuestionId ? (
        <div className="fixed inset-x-0 bottom-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 shadow-[0_-8px_30px_rgba(0,0,0,0.1)] p-5 z-50 animate-in slide-in-from-bottom-5 duration-200 flex flex-col gap-4 rounded-t-3xl md:static md:border md:rounded-xl md:shadow-lg md:mb-4">
           
           <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-widest">Input Note</span>
              <button 
                onClick={() => setActiveQuestionId(null)} 
                className="p-2 -mr-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
           </div>
           
           {/* Insight Popup */}
           {importedData && showInsight && (
             <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-3">
                    <Sparkles className="w-4 h-4 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase mb-0.5">Lead Insight</p>
                      <p className="text-neutral-900 dark:text-white text-sm font-medium">{importedData}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setTempAnswer(importedData)}
                    className="text-xs bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-md font-bold shadow-sm active:scale-95 flex items-center gap-1 hover:bg-amber-50 dark:hover:bg-amber-900/50"
                  >
                    <Copy className="w-3 h-3" /> Use
                  </button>
                </div>
             </div>
           )}

           <textarea
              ref={questionInputRef}
              value={tempAnswer}
              onChange={(e) => setTempAnswer(e.target.value)}
              placeholder="Type notes or verify import..."
              className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:border-black dark:focus:border-white outline-none resize-none text-neutral-900 dark:text-white h-28 text-base shadow-inner transition-all"
           />

           <div className="flex gap-3">
             <button 
               onClick={handleSaveAndStay}
               className="flex-1 px-4 py-3.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-[0.98] transition-all"
             >
               Save Note
             </button>
             <button 
               onClick={handleConfirmAndNext}
               className="flex-[2] px-4 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-md hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
             >
               {isLastSection ? 'Confirm & Finish' : 'Confirm & Next'} 
               <ArrowRight className="w-5 h-5" />
             </button>
           </div>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-0 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 p-4 z-40 flex justify-between gap-4 md:static md:bg-transparent md:border-0 md:p-0">
           <button 
             onClick={prevSection}
             disabled={activeSectionIndex === 0}
             className="px-6 py-3.5 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-700 dark:text-neutral-300 font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 active:bg-neutral-100 dark:active:bg-neutral-700 transition-colors flex items-center gap-2"
             title="Previous Section"
           >
             <ChevronLeft className="w-5 h-5" />
             <span className="hidden xs:inline">Previous</span>
           </button>
           
           <button 
             onClick={nextSection}
             className="flex-1 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 py-3.5"
           >
             {isLastSection ? 'Finish Screening' : 'Next Section'}
             <ArrowRight className="w-5 h-5" />
           </button>
        </div>
      )}
    </div>
  );
};

export default ScreeningSession;