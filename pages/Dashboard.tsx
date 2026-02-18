import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getLeads, createLead, deleteLead, updateLead } from '../services/storage';
import { Lead, SavedAnswer } from '../types';
import { Plus, User, Clock, ChevronRight, Trash2, FileText, Upload, AlertCircle, CheckCircle, History, ListTodo, Calendar, Phone, MapPin, Briefcase, Download, X, CheckSquare, Square } from 'lucide-react';
import Papa from 'papaparse';

const Dashboard: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [newLeadName, setNewLeadName] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLeads(getLeads());
  }, []);

  // Clear selection when tab changes to avoid confusion
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim()) return;
    const lead = createLead(newLeadName, interviewerName);
    setLeads(getLeads());
    setIsModalOpen(false);
    setNewLeadName('');
    setInterviewerName('');
    navigate(`/screen/${lead.id}`);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this session?')) {
      deleteLead(id);
      setLeads(getLeads());
      // Remove from selection if it was selected
      if (selectedIds.has(id)) {
        const newSet = new Set(selectedIds);
        newSet.delete(id);
        setSelectedIds(newSet);
      }
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} selected session(s)? This cannot be undone.`)) {
      selectedIds.forEach(id => deleteLead(id));
      setLeads(getLeads());
      setSelectedIds(new Set());
    }
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayedLeads.length) {
      setSelectedIds(new Set());
    } else {
      const newSet = new Set(displayedLeads.map(l => l.id));
      setSelectedIds(newSet);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Qualified': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
      case 'Disqualified': return 'bg-red-50 text-red-600 border-red-100 decoration-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50';
      case 'Review': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      default: return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-900/50';
    }
  };

  const getNextStepIcon = (type?: string) => {
    switch(type) {
      case 'Meeting Fixed': return <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      case 'Call Back': return <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
      case 'Physical Visit': return <MapPin className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />;
      case 'Manager Reach Out': return <Briefcase className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-neutral-500" />;
    }
  };

  const handleBulkExport = () => {
    const leadsToExport = selectedIds.size > 0 
      ? leads.filter(l => selectedIds.has(l.id))
      : leads.filter(l => ['Review', 'Qualified', 'Disqualified'].includes(l.status));

    if (leadsToExport.length === 0) {
      alert("No data to export.");
      return;
    }

    const headers = [
      'Lead Name', 'Interviewer', 'Status', 'Date', 'Grade', 'Next Step', 'Next Step Date', 'Session Notes',
      'Investment Budget', '10 Vehicle Commit', 'Timeline', 'Experience', 'Biz Model Awareness'
    ];

    const rows = leadsToExport.map(lead => [
      lead.name,
      lead.interviewer || '',
      lead.status,
      new Date(lead.createdAt).toLocaleDateString(),
      lead.internalScore.overallRating || 'N/A',
      lead.nextStep?.status || '-',
      lead.nextStep?.date ? new Date(lead.nextStep.date).toLocaleString() : '-',
      lead.generalNotes || '',
      lead.answers['q_inv_range']?.answer || lead.answers['q_inv_range']?.importedAnswer || '-',
      lead.answers['q_fleet_scale']?.answer || lead.answers['q_fleet_scale']?.importedAnswer || '-',
      lead.answers['q_timeline']?.answer || lead.answers['q_timeline']?.importedAnswer || '-',
      lead.answers['q_fleet_exp']?.answer || lead.answers['q_fleet_exp']?.importedAnswer || '-',
      lead.answers['q_why_model']?.answer || lead.answers['q_why_model']?.importedAnswer || '-',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${(c||'').replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FranchiseScreen_Export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ type: 'success', message: 'Reading file...' });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const currentLeads = getLeads();
          let importedCount = 0;
          let skippedCount = 0;
          
          const rows = [...results.data];

          rows.forEach((row: any) => {
            const fullName = row['full_name'] || row['Full Name'] || 'Unknown Candidate';
            if (!fullName || fullName === 'Unknown Candidate') return;

            const rowPhone = (row['phone_number'] || row['Phone Number'] || '').toString().trim().replace(/\D/g, ''); 
            const rowEmail = (row['email'] || row['Email'] || '').toString().trim().toLowerCase();
            const rowNameClean = fullName.trim().toLowerCase();

            const isDuplicate = currentLeads.some(existing => {
              const existingName = existing.name.trim().toLowerCase();
              if (existingName === rowNameClean) return true;
              const existingPhone = (existing.answers['q_contact']?.importedAnswer || existing.answers['q_contact']?.answer || '').toString().replace(/\D/g, '');
              if (rowPhone.length > 5 && existingPhone.length > 5 && rowPhone === existingPhone) return true;
              const existingEmail = (existing.answers['q_email']?.importedAnswer || existing.answers['q_email']?.answer || '').toString().trim().toLowerCase();
              if (rowEmail.length > 5 && existingEmail.length > 5 && rowEmail === existingEmail) return true;
              return false;
            });

            if (isDuplicate) {
              skippedCount++;
              return;
            }

            const newLead = createLead(fullName);
            const answersToMap: Record<string, string> = {
              'q_city': row['city'] || row['City'],
              'q_contact': row['phone_number'] || row['Phone Number'],
              'q_email': row['email'] || row['Email'],
              'q_running_biz': row['do_you_currently_own_a_business?'],
              'q_fleet_exp': row['do_you_have_prior_experience_in_the_car_rental_or_related_industries?'],
              'q_inv_range': row['estimated_investment_budget:'],
              'q_why_model': row['are_you_familiar_with_the_wow_carz_business_model_and_terms?'] 
                  ? `Familiar with model/terms: ${row['are_you_familiar_with_the_wow_carz_business_model_and_terms?']}` 
                  : '',
              'q_timeline': row['how_soon_are_you_planning_to_start_the_franchise?'],
              'q_fleet_scale': row['are_you_willing_to_invest_in_a_minimum_of_10_vehicles?'] 
                  ? `Willing to invest in min 10 vehicles: ${row['are_you_willing_to_invest_in_a_minimum_of_10_vehicles?']}`
                  : '',
            };

            const updatedAnswers = { ...newLead.answers };
            Object.entries(answersToMap).forEach(([qId, val]) => {
              if (val && typeof val === 'string' && val.trim() !== '') {
                updatedAnswers[qId] = {
                  questionId: qId,
                  answer: '',
                  importedAnswer: val.trim(),
                  skipped: false,
                  selected: false 
                };
              }
            });

            updateLead({ ...newLead, answers: updatedAnswers, status: 'New' });
            importedCount++;
          });

          setLeads(getLeads());
          setImportStatus({ 
            type: 'success', 
            message: `Imported ${importedCount} new leads (${skippedCount} duplicates skipped).` 
          });
          
          if (fileInputRef.current) fileInputRef.current.value = '';
          setTimeout(() => setImportStatus(null), 5000);

        } catch (error) {
          console.error("Import error", error);
          setImportStatus({ type: 'error', message: 'Failed to process CSV file.' });
        }
      },
      error: (error) => {
        setImportStatus({ type: 'error', message: `CSV Parsing Error: ${error.message}` });
      }
    });
  };

  const queueLeads = leads.filter(l => ['New', 'In Progress'].includes(l.status));
  const historyLeads = leads.filter(l => ['Review', 'Qualified', 'Disqualified'].includes(l.status));
  const displayedLeads = activeTab === 'queue' ? queueLeads : historyLeads;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Lead Dashboard</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Manage your screening queue and history.</p>
        </div>
        
        {selectedIds.size > 0 ? (
           <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{selectedIds.size} Selected</span>
              <button 
                onClick={handleBulkDelete}
                className="bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors border border-red-200 dark:border-red-900/50"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
              {activeTab === 'history' && (
                <button 
                  onClick={handleBulkExport}
                  className="bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 px-4 py-2.5 rounded-lg shadow-sm font-medium flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Export Selected
                </button>
              )}
           </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 px-4 py-2.5 rounded-lg shadow-sm font-medium flex items-center gap-2 transition-all active:scale-95 group"
            >
              <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
              Import CSV
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white px-4 py-2.5 rounded-lg shadow-md font-medium flex items-center gap-2 transition-all active:scale-95 group"
            >
              <Plus className="w-4 h-4 text-white/90 group-hover:rotate-90 transition-transform" />
              New Session
            </button>
          </div>
        )}
      </div>

      {importStatus && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800' : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/50'} border`}>
          {importStatus.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
          <span className="font-medium">{importStatus.message}</span>
        </div>
      )}

      {/* Tabs & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-900 p-1.5 rounded-xl w-fit border border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all
              ${activeTab === 'queue' ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}
            `}
          >
            <ListTodo className={`w-4 h-4 ${activeTab === 'queue' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
            Queue ({queueLeads.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all
              ${activeTab === 'history' ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}
            `}
          >
            <History className={`w-4 h-4 ${activeTab === 'history' ? 'text-purple-600 dark:text-purple-400' : ''}`} />
            History ({historyLeads.length})
          </button>
        </div>

        {displayedLeads.length > 0 && (
           <button 
             onClick={toggleSelectAll}
             className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors flex items-center gap-1.5"
           >
             {selectedIds.size === displayedLeads.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
             {selectedIds.size === displayedLeads.length ? 'Deselect All' : 'Select All'}
           </button>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden min-h-[300px]">
        {displayedLeads.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 dark:text-neutral-600">
            <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium text-neutral-500 dark:text-neutral-400">No leads in {activeTab === 'queue' ? 'queue' : 'history'}.</p>
            {activeTab === 'queue' && <p className="text-sm mt-1">Import a CSV or start a new session.</p>}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {displayedLeads.map((lead) => {
               const isSelected = selectedIds.has(lead.id);
               return (
                <div 
                  key={lead.id} 
                  className={`group relative p-4 transition-all hover:bg-neutral-50 dark:hover:bg-neutral-800/50 
                    ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : ''}
                  `}
                >
                  <div className="flex items-start gap-3 md:gap-4">
                    {/* Checkbox - Aligned with Name visually */}
                    <div className="pt-1">
                        <button
                            onClick={(e) => toggleSelection(e, lead.id)}
                            className="text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                            {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                                <Square className="w-5 h-5" />
                            )}
                        </button>
                    </div>

                    {/* Main Content */}
                    <Link 
                        to={activeTab === 'queue' ? `/screen/${lead.id}` : `/review/${lead.id}`} 
                        className="flex-1 min-w-0 flex items-start gap-3 md:gap-4 group-hover:opacity-90 transition-opacity"
                    >
                        {/* Avatar */}
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-base md:text-lg shrink-0 border 
                        ${activeTab === 'queue' ? 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-indigo-700 dark:text-white' : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'}`}>
                        {lead.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Text Details */}
                        <div className="min-w-0 flex-1 pt-0.5">
                            <h3 className="font-bold text-neutral-900 dark:text-white text-base md:text-lg truncate pr-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {lead.name}
                            </h3>
                            
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                                <span className="flex items-center gap-1 shrink-0">
                                    <Clock className="w-3.5 h-3.5" />
                                    {new Date(lead.createdAt).toLocaleDateString()}
                                </span>

                                {lead.interviewer && (
                                  <span className="flex items-center gap-1 shrink-0 text-neutral-400 dark:text-neutral-500">
                                    <User className="w-3.5 h-3.5" />
                                    By: {lead.interviewer}
                                  </span>
                                )}
                                
                                <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium border shrink-0 ${getStatusColor(lead.status)}`}>
                                    {lead.status}
                                </span>

                                {/* Grade Badge */}
                                {lead.internalScore.overallRating && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-black border border-black dark:border-white shrink-0">
                                    Grade: {lead.internalScore.overallRating}
                                    </span>
                                )}

                                {/* Next Step Badge */}
                                {lead.nextStep && activeTab === 'history' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 shrink-0">
                                    {getNextStepIcon(lead.nextStep.status)}
                                    <span className="truncate max-w-[100px]">{lead.nextStep.status}</span>
                                    </span>
                                )}

                                {Object.values(lead.answers).some((a: SavedAnswer) => !!a.importedAnswer) && lead.status === 'New' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1 shrink-0">
                                    <FileText className="w-3 h-3" /> Imported
                                </span>
                                )}
                            </div>
                        </div>
                    </Link>

                    {/* Actions */}
                    <div className="flex items-center gap-1 md:gap-2 shrink-0 self-center md:self-auto pt-1">
                        {activeTab === 'queue' ? (
                             <Link 
                             to={`/screen/${lead.id}`}
                             className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                           >
                             <span className="hidden md:inline">Start</span> <ChevronRight className="w-5 h-5" />
                           </Link>
                        ) : (
                            <>
                                <button 
                                    onClick={(e) => handleDelete(e, lead.id)}
                                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <Link to={`/review/${lead.id}`} className="p-2 text-neutral-300 dark:text-neutral-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                    <ChevronRight className="w-5 h-5" />
                                </Link>
                            </>
                        )}
                    </div>
                  </div>
                </div>
               );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 dark:bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200 border border-neutral-200 dark:border-neutral-800">
            <h2 className="text-xl font-bold mb-4 text-neutral-900 dark:text-white">Start New Screening</h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Candidate Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500 focus:border-indigo-600 dark:focus:border-indigo-500 outline-none transition-all dark:text-white"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Interviewer Name (Optional)</label>
                  <input 
                    type="text" 
                    value={interviewerName}
                    onChange={(e) => setInterviewerName(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500 focus:border-indigo-600 dark:focus:border-indigo-500 outline-none transition-all dark:text-white"
                    placeholder="e.g. Alex Smith"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newLeadName.trim()}
                  className="px-5 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-400 font-bold disabled:opacity-50 transition-colors shadow-lg"
                >
                  Start Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;