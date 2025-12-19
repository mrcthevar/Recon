
import React, { useState } from 'react';
import { Archive, Download, Trash2, Crosshair, CheckSquare, Square, MoreHorizontal } from 'lucide-react';
import { Company } from '../types';

interface SidebarProps {
  savedCompanies: Company[];
  onSelectCompany: (company: Company) => void;
  selectedCompanyId: string | null;
  onRemoveCompanies: (ids: string[]) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  savedCompanies, 
  onSelectCompany, 
  selectedCompanyId,
  onRemoveCompanies
}) => {
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
    if (window.confirm(`Delete ${selectedIds.length} leads?`)) {
      onRemoveCompanies(selectedIds);
      setSelectedIds([]);
      setIsSelectionMode(false);
    }
  };

  const handleExportCSV = () => {
    const targets = isSelectionMode && selectedIds.length > 0
      ? savedCompanies.filter(c => selectedIds.includes(c.id))
      : savedCompanies;

    if (targets.length === 0) return;

    const headers = ['Name', 'Industry', 'Location', 'Website', 'Email', 'Phone', 'Recent Work', 'Hero Product', 'Hot Score', 'Status'];
    
    // CSV Clean function to handle commas in data
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
        clean(c.heroProduct),
        clean(c.hotScore.toString()),
        clean(c.status)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `recon_leads_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-white/5">
      <div className="p-4 border-b border-neutral-200 dark:border-white/5 bg-neutral-100/50 dark:bg-white/5 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-semibold text-sm uppercase tracking-wider">
            <Archive className="w-4 h-4 text-accent" />
            <span>Saved Leads</span>
          </div>
          <p className="text-[10px] text-neutral-500 mt-1">TOTAL: {savedCompanies.length}</p>
        </div>
        
        {savedCompanies.length > 0 && (
          <button 
            onClick={toggleSelectionMode}
            className={`p-1.5 rounded transition-colors ${isSelectionMode ? 'text-accent bg-accent/10' : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}
            title="Toggle Selection Mode"
          >
             <CheckSquare className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {savedCompanies.length === 0 ? (
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
        )}
      </div>
      
      {/* Actions Toolbar */}
      {savedCompanies.length > 0 && (
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
