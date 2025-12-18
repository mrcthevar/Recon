import React, { useState } from 'react';
import { Search, MapPin, Briefcase, ChevronRight, Globe, Loader2, Radar, Plus, Building2 } from 'lucide-react';
import { Company, SearchMode } from '../types';

interface SearchPaneProps {
  companies: Company[];
  selectedCompanyId: string | null;
  onSelectCompany: (id: string) => void;
  onSearch?: (mode: SearchMode, p1: string, p2: string) => void;
  onLoadMore?: () => void;
  isSearching?: boolean;
}

export const SearchPane: React.FC<SearchPaneProps> = ({ 
  companies, 
  selectedCompanyId, 
  onSelectCompany,
  onSearch,
  onLoadMore,
  isSearching = false
}) => {
  const [mode, setMode] = useState<SearchMode>('discovery');
  
  // Discovery Inputs
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  
  // Lookup Inputs
  const [companyName, setCompanyName] = useState('');
  const [lookupCity, setLookupCity] = useState('');

  const handleSubmit = () => {
    if (!onSearch) return;

    if (mode === 'discovery') {
       if (industry && city) onSearch('discovery', industry, city);
    } else {
       if (companyName) onSearch('lookup', companyName, lookupCity || 'Anywhere'); // City optional for lookup
    }
  };

  return (
    <div className="flex flex-col h-full">
      
      {/* Search Header Area - Fixed Top */}
      <div className="mb-2 space-y-4 relative z-10 bg-neutral-50 dark:bg-neutral-950 pb-2">
        <div className="flex items-center justify-between px-1">
             <h2 className="text-lg font-semibold text-neutral-900 dark:text-white tracking-tight">
               Search & Leads
             </h2>
             {/* Mode Toggles */}
             <div className="flex p-1 rounded-lg bg-neutral-200 dark:bg-white/5 border border-neutral-200 dark:border-white/5">
                 <button
                    onClick={() => setMode('discovery')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${mode === 'discovery' ? 'bg-white dark:bg-neutral-800 text-accent shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                 >
                    Scout
                 </button>
                 <button
                    onClick={() => setMode('lookup')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${mode === 'lookup' ? 'bg-white dark:bg-neutral-800 text-accent shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                 >
                    Lookup
                 </button>
             </div>
        </div>
        
        <div className="space-y-3">
          {mode === 'discovery' ? (
              <>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-4 w-4 text-neutral-400 group-focus-within:text-accent transition-colors duration-300" />
                    </div>
                    <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Industry (e.g. Fintech)"
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
                    placeholder="City (e.g. London)"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="block w-full pl-10 pr-3 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all shadow-sm hover:shadow-md dark:hover:bg-neutral-800"
                    />
                </div>
              </>
          ) : (
              <>
                 <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-4 w-4 text-neutral-400 group-focus-within:text-accent transition-colors duration-300" />
                    </div>
                    <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Company Name"
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
                    value={lookupCity}
                    onChange={(e) => setLookupCity(e.target.value)}
                    placeholder="City (Optional)"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="block w-full pl-10 pr-3 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all shadow-sm hover:shadow-md dark:hover:bg-neutral-800"
                    />
                </div>
              </>
          )}

          <button 
            onClick={handleSubmit}
            disabled={isSearching || (mode === 'discovery' ? (!industry || !city) : !companyName)}
            className={`
              w-full flex items-center justify-center py-3 px-4 rounded-xl font-medium transition-all duration-300 shadow-lg 
              ${isSearching || (mode === 'discovery' ? (!industry || !city) : !companyName)
                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed shadow-none' 
                : 'bg-accent hover:bg-accent-glow text-white shadow-accent/20 hover:shadow-accent/40 active:scale-[0.98]'}
            `}
          >
            {isSearching && companies.length === 0 ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {isSearching && companies.length === 0 ? (mode === 'discovery' ? 'Scouting...' : 'Looking up...') : (mode === 'discovery' ? 'Find Leads' : 'Search Company')}
          </button>
        </div>
      </div>

      {/* Soft Gradient Divider */}
      <div className="h-6 w-full bg-gradient-to-b from-neutral-50 via-neutral-50 to-transparent dark:from-neutral-950 dark:via-neutral-950 z-10 shrink-0"></div>

      {/* Results List - SCROLLABLE AREA */}
      <div id="results-container" className="flex-1 overflow-y-auto -mx-2 px-2 pb-4 space-y-3 min-h-0">
        {companies.length === 0 && !isSearching && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60 animate-fade-in p-8">
             <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-900/50 flex items-center justify-center mb-4 ring-1 ring-neutral-200 dark:ring-white/5">
                 <Radar className="w-8 h-8 text-neutral-400" />
             </div>
             <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
               Awaiting Mission
             </h3>
             <p className="text-xs text-neutral-500 max-w-[200px] leading-relaxed">
               {mode === 'discovery' ? "Enter an Industry and City above to scout for live leads." : "Enter a Company Name to find contact details."}
             </p>
          </div>
        )}

        {companies.map((company, index) => {
          const isSelected = selectedCompanyId === company.id;
          // Staggered delay for each card
          const animationDelay = `${(index % 10) * 50}ms`; // Limit stagger to first 10 to avoid long wait on load more
          
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
                <div className="flex-1 mr-2">
                  <h3 className={`font-semibold text-sm transition-colors ${isSelected ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-200 group-hover:text-neutral-900 dark:group-hover:text-white'}`}>
                    {company.name}
                  </h3>
                  <div className="flex items-center mt-1 space-x-2">
                      {company.website !== 'N/A' && (
                        <>
                          <Globe className="w-3 h-3 text-neutral-400 group-hover:text-accent transition-colors" />
                          <a 
                             href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                             target="_blank" 
                             rel="noreferrer"
                             onClick={(e) => e.stopPropagation()} // Prevent card selection when clicking link
                             className="text-xs text-neutral-500 hover:text-accent hover:underline truncate max-w-[150px] transition-colors"
                          >
                            {company.website.replace(/^https?:\/\/(www\.)?/, '')}
                          </a>
                        </>
                      )}
                  </div>
                </div>
                <span className={`
                  text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide transition-colors whitespace-nowrap
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
        })}
        
        {/* Load More Button - Only show in discovery mode */}
        {companies.length > 0 && mode === 'discovery' && (
           <button
              onClick={onLoadMore}
              disabled={isSearching}
              className={`
                 w-full py-3 mt-4 rounded-xl border border-dashed border-neutral-300 dark:border-white/20 text-sm font-medium
                 text-neutral-500 dark:text-neutral-400 hover:text-accent dark:hover:text-accent hover:border-accent dark:hover:border-accent
                 transition-all flex items-center justify-center gap-2 group shrink-0
                 ${isSearching ? 'opacity-50 cursor-wait' : ''}
              `}
           >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />}
              {isSearching ? 'Scouting More...' : 'Load More Leads'}
           </button>
        )}
      </div>
    </div>
  );
};