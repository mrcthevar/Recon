

import React, { useState } from 'react';
import { Archive, Download, Trash2, Crosshair, CheckSquare, Square, Briefcase } from 'lucide-react';
import { Company, SavedJob } from '../types';

interface SidebarProps {
  savedCompanies: Company[];
  savedJobs: SavedJob[];
  onSelectCompany: (company: Company) => void;
  selectedCompanyId: string | null;
  onRemoveCompanies: (ids: string[]) => void;
  onUpdateJobStatus: (id: string, status: 'Saved' | 'Applied' | 'Interviewing' | 'Offer') => void;
  onRemoveJobs: (ids: string[]) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  savedCompanies, 
  savedJobs,
  onSelectCompany, 
  selectedCompanyId,
  onRemoveCompanies,
  onUpdateJobStatus,
  onRemoveJobs
}) => {
  const [view, setView] = useState<'companies' | 'jobs'>('companies');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(sid => sid !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedIds([]);
    } else {
      setIsSelectionMode(true);
    }
  };

  const handleBulkDelete = () => {
    if (view === 'companies') {
        if (window.confirm(`Delete ${selectedIds.length} leads?`)) {
            onRemoveCompanies(selectedIds);
            setSelectedIds([]);
            setIsSelectionMode(false);
        }
    } else {
        if (window.confirm(`Delete ${selectedIds.length} jobs?`)) {
            onRemoveJobs(selectedIds);
            setSelectedIds([]);
            setIsSelectionMode(false);
        }
    }
  };

  const handleExportCSV = () => {
    if (view === 'companies') {
        const targets = isSelectionMode && selectedIds.length > 0
        ? savedCompanies.filter(c => selectedIds.includes(c.id))
        : savedCompanies;

        if (targets.length === 0) return;

        const headers = ['Name', 'Industry', 'Location', 'Website', 'Email', 'Phone', 'Recent Work', 'Hot Score', 'Status'];
        const clean = (text: string) => `"${(text || '').toString().replace(/"/g, '""')}"`;

        const csvContent = [
        headers.join(','),
        ...targets.map(c => [
            clean(c.name),
            clean(c.industry),
            clean(c.location),
            clean(c.website),
            clean(c.email),
            clean(c.phone),
            clean(c.recentWork),
            clean(c.hotScore.toString()),
            clean(c.status)
        ].join(','))
        ].join('\n');
        
        downloadCSV(csvContent, 'recon_leads');
    } else {
         const targets = isSelectionMode && selectedIds.length > 0
        ? savedJobs.filter(j => selectedIds.includes(j.id))
        : savedJobs;

        if (targets.length === 0) return;

        const headers = ['Title', 'Company', 'Location', 'Type', 'Salary', 'Status', 'Link'];
        const clean = (text: string) => `"${(text || '').toString().replace(/"/g, '""')}"`;

        const csvContent = [
        headers.join(','),
        ...targets.map(j => [
            clean(j.title),
            clean(j.companyName),
            clean(j.location),
            clean(j.type),
            clean(j.salary || ''),
            clean(j.status || 'Saved'),
            clean(j.link || '')
        ].join(','))
        ].join('\n');
        
        downloadCSV(csvContent, 'recon_jobs');
    }
  };

  const downloadCSV = (content: string, prefix: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${prefix}_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleJobClick = (job: SavedJob) => {
      // Find associated company and select it
      const company = savedCompanies.find(c => c.id === job.companyId);
      if (company) {
          onSelectCompany(company);
      }
  };

  return (
    <div className="h-full flex flex-col bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-white/5">
      {/* View Toggle Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-white/5 bg-neutral-100/50 dark:bg-white/5">
          <div className="flex bg-white dark:bg-neutral-800 rounded-lg p-1 border border-neutral-200 dark:border-white/5 mb-3">
              <button 
                onClick={() => setView('companies')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${view === 'companies' ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500'}`}
              >
                  <Archive className="w-3 h-3" /> Leads
              </button>
              <button 
                onClick={() => setView('jobs')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${view === 'jobs' ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500'}`}
              >
                  <Briefcase className="w-3 h-3" /> Pipeline
              </button>
          </div>
          
          <div className="flex justify-between items-center">
            <p className="text-[10px] text-neutral-500 font-medium tracking-wide uppercase">
                {view === 'companies' ? `${savedCompanies.length} Companies` : `${savedJobs.length} Jobs`}
            </p>
            
            {(view === 'companies' ? savedCompanies.length : savedJobs.length) > 0 && (
                <button 
                    onClick={toggleSelectionMode}
                    className={`p-1.5 rounded transition-colors ${isSelectionMode ? 'text-accent bg-accent/10' : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}
                    title="Toggle Selection Mode"
                >
                    <CheckSquare className="w-4 h-4" />
                </button>
            )}
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {/* COMPANIES VIEW */}
        {view === 'companies' && (
             savedCompanies.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-neutral-400 opacity-60">
                    <Crosshair className="w-8 h-8 mb-2 stroke-1" />
                    <span className="text-xs">No saved leads</span>
                </div>
             ) : (
                savedCompanies.map((company) => {
                    const isChecked = selectedIds.includes(company.id);
                    return (
                    <div
                        key={company.id}
                        onClick={() => isSelectionMode ? toggleSelection(company.id, { stopPropagation: () => {} } as any) : onSelectCompany(company)}
                        className={`
                        group relative p-3 rounded-lg cursor-pointer border transition-all duration-200 flex items-center gap-3
                        ${selectedCompanyId === company.id 
                            ? 'bg-white dark:bg-neutral-800 border-accent shadow-sm' 
                            : 'bg-transparent border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-200 dark:hover:border-white/10'}
                        `}
                    >
                        {isSelectionMode && (
                        <div 
                            onClick={(e) => toggleSelection(company.id, e)}
                            className={`shrink-0 text-neutral-400 ${isChecked ? 'text-accent' : 'hover:text-neutral-500'}`}
                        >
                            {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </div>
                        )}

                        <div className="flex-1 min-w-0">
                        <h4 className={`text-xs font-bold truncate ${selectedCompanyId === company.id ? 'text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                            {company.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-neutral-400 truncate max-w-[80px]">{company.industry}</span>
                            <div className={`w-1.5 h-1.5 rounded-full ${company.status === 'Contacted' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                        </div>
                        </div>
                        
                        {!isSelectionMode && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemoveCompanies([company.id]); }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-neutral-400 transition-opacity"
                            title="Remove Lead"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                        )}
                    </div>
                    );
                })
             )
        )}

        {/* JOBS VIEW */}
        {view === 'jobs' && (
             savedJobs.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-neutral-400 opacity-60">
                    <Briefcase className="w-8 h-8 mb-2 stroke-1" />
                    <span className="text-xs">No tracked jobs</span>
                </div>
             ) : (
                 savedJobs.map((job) => {
                     const isChecked = selectedIds.includes(job.id);
                     const statusColors = {
                         'Saved': 'bg-neutral-500',
                         'Applied': 'bg-blue-500',
                         'Interviewing': 'bg-purple-500',
                         'Offer': 'bg-green-500'
                     };

                     return (
                         <div
                            key={job.id}
                            className="group relative p-3 rounded-lg border border-neutral-200 dark:border-white/5 bg-white dark:bg-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                         >
                             <div className="flex items-start gap-3">
                                {isSelectionMode && (
                                    <div 
                                        onClick={(e) => toggleSelection(job.id, e)}
                                        className={`mt-1 shrink-0 text-neutral-400 cursor-pointer ${isChecked ? 'text-accent' : 'hover:text-neutral-500'}`}
                                    >
                                        {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleJobClick(job)}>
                                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white truncate">{job.title}</h4>
                                    <p className="text-[10px] text-neutral-500 truncate">{job.companyName}</p>
                                    <div className="mt-2 flex items-center justify-between">
                                        <select 
                                            value={job.status || 'Saved'}
                                            onChange={(e) => onUpdateJobStatus(job.id, e.target.value as any)}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`text-[9px] font-bold uppercase rounded px-1.5 py-0.5 border-none outline-none cursor-pointer text-white ${statusColors[job.status || 'Saved'] || 'bg-neutral-500'}`}
                                        >
                                            <option value="Saved" className="text-black">Saved</option>
                                            <option value="Applied" className="text-black">Applied</option>
                                            <option value="Interviewing" className="text-black">Interviewing</option>
                                            <option value="Offer" className="text-black">Offer</option>
                                        </select>
                                    </div>
                                </div>
                                {!isSelectionMode && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRemoveJobs([job.id]); }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-neutral-400 transition-opacity"
                                        title="Remove Job"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                             </div>
                         </div>
                     );
                 })
             )
        )}
      </div>
      
      {/* Actions Toolbar */}
      {(view === 'companies' ? savedCompanies.length : savedJobs.length) > 0 && (
         <div className="p-3 border-t border-neutral-200 dark:border-white/5 bg-neutral-100/50 dark:bg-black/20 space-y-2">
            {isSelectionMode ? (
               <div className="flex gap-2 animate-fade-in-up">
                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedIds.length === 0}
                    className="flex-1 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete ({selectedIds.length})</span>
                  </button>
                  <button
                    onClick={handleExportCSV}
                    disabled={selectedIds.length === 0}
                    className="flex-1 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-xs font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export ({selectedIds.length})</span>
                  </button>
               </div>
            ) : (
                <button
                    onClick={handleExportCSV}
                    className="w-full py-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 hover:border-accent hover:text-accent text-neutral-500 dark:text-neutral-400 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                    <Download className="w-3 h-3" />
                    <span>Export All CSV</span>
                </button>
            )}
         </div>
      )}
    </div>
  );
};