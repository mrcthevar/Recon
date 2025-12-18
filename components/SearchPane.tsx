import React, { useState } from 'react';
import { Search, MapPin, Briefcase, ChevronRight, Globe, Loader2 } from 'lucide-react';
import { Company } from '../types';

interface SearchPaneProps {
  companies: Company[];
  selectedCompanyId: string | null;
  onSelectCompany: (id: string) => void;
  onSearch?: (industry: string, city: string) => void;
  isSearching?: boolean;
}

export const SearchPane: React.FC<SearchPaneProps> = ({ 
  companies, 
  selectedCompanyId, 
  onSelectCompany,
  onSearch,
  isSearching = false
}) => {
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');

  const handleSubmit = () => {
    if (onSearch && industry && city) {
      onSearch(industry, city);
    }
  };

  return (
    <div className="flex flex-col h-full">
      
      {/* Search Header */}
      <div className="mb-4 space-y-4 relative z-10">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white tracking-tight px-1">
          Search & Leads
        </h2>
        
        <div className="space-y-3">
          {/* Spotlight Inputs */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Briefcase className="h-4 w-4 text-neutral-400 group-focus-within:text-accent transition-colors duration-300" />
            </div>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Industry (e.g. Fintech, Fashion)"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="block w-full pl-10 pr-3 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all shadow-sm hover:shadow-md dark:hover:bg-neutral-800"
            />
          </div>
          
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-4 w-4 text-neutral-400 group-focus-within:text-accent transition-colors duration-300" />
            </div>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City (e.g. New York, London)"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="block w-full pl-10 pr-3 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all shadow-sm hover:shadow-md dark:hover:bg-neutral-800"
            />
          </div>

          <button 
            onClick={handleSubmit}
            disabled={isSearching || !industry || !city}
            className={`
              w-full flex items-center justify-center py-3 px-4 rounded-xl font-medium transition-all duration-300 shadow-lg 
              ${isSearching || !industry || !city 
                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed shadow-none' 
                : 'bg-accent hover:bg-accent-glow text-white shadow-accent/20 hover:shadow-accent/40 active:scale-[0.98]'}
            `}
          >
            {isSearching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {isSearching ? 'Scouting...' : 'Find Leads'}
          </button>
        </div>
      </div>

      {/* Soft Gradient Divider */}
      <div className="h-6 w-full bg-gradient-to-b from-neutral-50 via-neutral-50 to-transparent dark:from-neutral-950 dark:via-neutral-950 z-10 shrink-0"></div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto -mx-2 px-2 pb-4 space-y-3">
        {companies.length === 0 ? (
          <div className="text-center py-10 opacity-60 animate-fade-in">
             <p className="text-sm text-neutral-500">No leads found. Try a different sector.</p>
          </div>
        ) : (
          companies.map((company, index) => {
            const isSelected = selectedCompanyId === company.id;
            // Staggered delay for each card
            const animationDelay = `${index * 100}ms`;
            
            return (
              <div
                key={company.id}
                onClick={() => onSelectCompany(company.id)}
                style={{ animationDelay }}
                className={`
                  relative p-4 rounded-xl border cursor-pointer transition-all duration-300 group opacity-0 animate-fade-in-up
                  ${isSelected 
                    ? 'bg-white dark:bg-neutral-800 border-accent shadow-md ring-1 ring-accent z-10 scale-[1.01]' 
                    : 'bg-white dark:bg-neutral-900/50 border-neutral-200 dark:border-white/5 hover:border-neutral-300 dark:hover:border-white/20 hover:shadow-sm hover:bg-white dark:hover:bg-neutral-800/80'}
                `}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`font-semibold text-sm transition-colors ${isSelected ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-200 group-hover:text-neutral-900 dark:group-hover:text-white'}`}>
                      {company.name}
                    </h3>
                    <div className="flex items-center mt-1 space-x-2">
                       <Globe className="w-3 h-3 text-neutral-400 group-hover:text-accent transition-colors" />
                       <span className="text-xs text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-400 transition-colors">{company.website}</span>
                    </div>
                  </div>
                  <span className={`
                    text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide transition-colors
                    ${company.status === 'New' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : 
                      company.status === 'Warm' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' :
                      'bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-400'}
                  `}>
                    {company.status}
                  </span>
                </div>
                
                {/* Active Indicator Slide-in */}
                <div className={`
                    mt-3 flex items-center text-xs font-medium text-accent overflow-hidden transition-all duration-300 ease-out
                    ${isSelected ? 'max-h-6 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}
                `}>
                    <span>Active Lead</span>
                    <ChevronRight className="w-3 h-3 ml-1 animate-pulse" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};