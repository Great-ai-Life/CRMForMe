import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getLeads, createLead, deleteLead, updateLead } from '../services/storage';
import { Lead, SavedAnswer } from '../types';
import { Plus, User, Clock, ChevronRight, Trash2, FileText, Upload, AlertCircle, CheckCircle, History, ListTodo, Calendar, Phone, MapPin, Briefcase, Download, PlayCircle } from 'lucide-react';
import Papa from 'papaparse';

const Dashboard: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [newLeadName, setNewLeadName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLeads(getLeads());
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim()) return;
    const lead = createLead(newLeadName);
    setLeads(getLeads());
    setIsModalOpen(false);
    setNewLeadName('');
    navigate(`/screen/${lead.id}`);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this session?')) {
      deleteLead(id);
      setLeads(getLeads());
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Qualified': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
      case 'Disqualified': return 'bg-red-50 text-red-600 border-red-100 decoration-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50';
      case 'Review': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      default: return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/50';
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
    const historyLeads = leads.filter(l => ['Review', 'Qualified', 'Disqualified'].includes(l.status));
    if (historyLeads.length === 0) {
      alert("No history to export.");
      return;
    }

    const headers = [
      'Lead Name', 'Status', 'Date', 'Grade', 'Next Step', 'Next Step Date', 'Session Notes',
      'Investment Budget', '10 Vehicle Commit', 'Timeline', 'Experience', 'Biz Model Awareness'
    ];

    const rows = historyLeads.map(lead => [
      lead.name,
      lead.status,
      new Date(lead.createdAt).toLocaleDateString(),
      lead.internalScore.overallRating || 'N/A',
      lead.nextStep?.status || '-',
      lead.nextStep?.date ? new Date(lead.nextStep.date).toLocaleString() : '-',
      lead.generalNotes || '',
      // Strategic Answers (using new mapping IDs)
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
    link.download = `FranchiseScreen_History_Export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          let importedCount = 0;
          const rows = [...results.data].reverse();

          rows.forEach((row: any) => {
            const fullName = row['full_name'] || row['Full Name'] || 'Unknown Candidate';
            if (!fullName || fullName === 'Unknown Candidate') return;

            const newLead = createLead(fullName);
            
            // Updated mapping to new Strategic IDs where relevant
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

            updateLead({
              ...newLead,
              answers: updatedAnswers,
              status: 'New'
            });
            importedCount++;
          });

          setLeads(getLeads());
          setImportStatus({ 
            type: 'success', 
            message: `Successfully imported ${importedCount} leads into Queue.` 
          });
          
          if (fileInputRef.current) fileInputRef.current.value = '';
          setTimeout(() => setImportStatus(null), 4000);

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
            <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
            Import CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black px-4 py-2.5 rounded-lg shadow-md font-medium flex items-center gap-2 transition-all active:scale-95 group"
          >
            <Plus className="w-4 h-4 text-emerald-400 dark:text-emerald-600 group-hover:rotate-90 transition-transform" />
            New Session
          </button>
        </div>
      </div>

      {importStatus && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800' : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/50'} border`}>
          {importStatus.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
          <span className="font-medium">{importStatus.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-900 p-1.5 rounded-xl w-fit border border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all
              ${activeTab === 'queue' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}
            `}
          >
            <ListTodo className={`w-4 h-4 ${activeTab === 'queue' ? 'text-blue-600 dark:text-blue-400' : ''}`} />
            Queue ({queueLeads.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all
              ${activeTab === 'history' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}
            `}
          >
            <History className={`w-4 h-4 ${activeTab === 'history' ? 'text-purple-600 dark:text-purple-400' : ''}`} />
            History ({historyLeads.length})
          </button>
        </div>

        {activeTab === 'history' && historyLeads.length > 0 && (
          <button 
            onClick={handleBulkExport}
            className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export All History
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
            {displayedLeads.map((lead) => (
              <Link 
                key={lead.id} 
                to={activeTab === 'queue' ? `/screen/${lead.id}` : `/review/${lead.id}`}
                className="block p-5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 border 
                      ${activeTab === 'queue' ? 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white' : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'}`}>
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-900 dark:text-white text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {lead.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </span>
                        
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>

                        {lead.internalScore.overallRating && (
                           <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-black border border-black dark:border-white">
                             Grade: {lead.internalScore.overallRating}
                           </span>
                        )}

                        {/* Next Step Indicator in History */}
                        {lead.nextStep && activeTab === 'history' && (
                          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">
                            {getNextStepIcon(lead.nextStep.status)}
                            {lead.nextStep.status}
                            {lead.nextStep.date && ` • ${new Date(lead.nextStep.date).toLocaleDateString()}`}
                          </span>
                        )}

                        {Object.values(lead.answers).some((a: SavedAnswer) => !!a.importedAnswer) && lead.status === 'New' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Imported
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-3 pl-16 sm:pl-0">
                     {activeTab === 'queue' ? (
                       <span className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                         Start <ChevronRight className="w-4 h-4" />
                       </span>
                     ) : (
                       <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => handleDelete(e, lead.id)}
                            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <ChevronRight className="w-5 h-5 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400" />
                       </div>
                     )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 dark:bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200 border border-neutral-200 dark:border-neutral-800">
            <h2 className="text-xl font-bold mb-4 text-neutral-900 dark:text-white">Start New Screening</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Candidate Name</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white outline-none transition-all dark:text-white"
                  placeholder="e.g. John Doe"
                />
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
                  className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 font-bold disabled:opacity-50 transition-colors shadow-lg"
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