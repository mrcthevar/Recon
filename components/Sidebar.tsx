
import React from 'react';
import { Archive, Users, ChevronRight, Trash2, Crosshair } from 'lucide-react';
import { Company } from '../types';

interface SidebarProps {
  savedCompanies: Company[];
  onSelectCompany: (company: Company) => void;
  selectedCompanyId: string | null;
  onRemoveCompany: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  savedCompanies, 
  onSelectCompany, 
  selectedCompanyId,
  onRemoveCompany
}) => {
  return (
    <div className="h-full flex flex-col bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-white/5">
      <div className="p-4 border-b border-neutral-200 dark:border-white/5 bg-neutral-100/50 dark:bg-white/5">
        <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-semibold text-sm uppercase tracking-wider">
          <Archive className="w-4 h-4 text-accent" />
          <span>Saved Leads</span>
        </div>
        <p className="text-[10px] text-neutral-500 mt-1">SAVED COMPANIES: {savedCompanies.length}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {savedCompanies.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-neutral-400 opacity-60">
            <Crosshair className="w-8 h-8 mb-2 stroke-1" />
            <span className="text-xs">No companies saved</span>
          </div>
        ) : (
          savedCompanies.map((company) => (
            <div
              key={company.id}
              onClick={() => onSelectCompany(company)}
              className={`
                group relative p-3 rounded-lg cursor-pointer border transition-all duration-200
                ${selectedCompanyId === company.id 
                  ? 'bg-white dark:bg-neutral-800 border-accent shadow-sm' 
                  : 'bg-transparent border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-200 dark:hover:border-white/10'}
              `}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h4 className={`text-xs font-bold truncate ${selectedCompanyId === company.id ? 'text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>
                    {company.name}
                  </h4>
                  <p className="text-[10px] text-neutral-400 truncate mt-0.5">{company.industry}</p>
                </div>
                
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveCompany(company.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-neutral-400 transition-opacity"
                  title="Remove Lead"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 mt-2">
                 <div className={`w-1.5 h-1.5 rounded-full ${company.status === 'Contacted' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                 <span className="text-[9px] uppercase tracking-wide text-neutral-500">{company.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};