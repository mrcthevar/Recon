
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Briefcase, ChevronRight, Globe, Loader2, Radar, Building2, Flame, ExternalLink, RefreshCw, UserSearch, DollarSign } from 'lucide-react';
import { Company, SearchMode, Source } from '../types';

interface SearchPaneProps {
  companies: Company[];
  sources?: Source[];
  selectedCompanyId: string | null;
  onSelectCompany: (id: string) => void;
  onSearch?: (mode: SearchMode, p1: string, p2: string) => void;
  onLoadMore?: () => void;
  isSearching?: boolean;
  activeMode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}

const SkeletonCard = () => (
  <div className="p-4 rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-neutral-900/50 space-y-3 animate-pulse">
    <div className="flex justify-between items-start">
        <div className="space-y-2 w-full">
             <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3"></div>
             <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2"></div>
        </div>
        <div className="w-10 h-5 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
    </div>
    <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded w-full"></div>
    <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3"></div>
  </div>
);

export const SearchPane: React.FC<SearchPaneProps> = ({ 
  companies,
  sources = [],
  selectedCompanyId, 
  onSelectCompany,
  onSearch,
  onLoadMore,
  isSearching = false,
  activeMode,
  onModeChange
}) => {
  // Local input state persists even when mode changes (if component doesn't unmount)
  // Discovery Inputs
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  
  // Lookup Inputs
  const [companyName, setCompanyName] = useState('');
  const [lookupCity, setLookupCity] = useState('');

  // Jobs Inputs
  const [role, setRole] = useState('');
  const [jobCity, setJobCity] = useState('');

  // Loading Message State
  const [loadingText, setLoadingText] = useState('Searching...');
  
  // Infinite Scroll Ref
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSearching) return;
    
    const messages = activeMode === 'jobs' ? [
        "Scanning Job Boards...",
        "Identifying Companies...",
        "Checking Career Pages...",
        "Evaluating Hiring Culture...",
        "Compiling Open Roles..."
    ] : [
        "Analyzing Industry...",
        "Finding Companies...",
        "Finding Contact Info...",
        "Verifying Details...",
        "Preparing Report..."
    ];
    
    let i = 0;
    const interval = setInterval(() => {
        setLoadingText(messages[i]);
        i = (i + 1) % messages.length;
    }, 1200);
    
    return () => clearInterval(interval);
  }, [isSearching, activeMode]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!onLoadMore || activeMode === 'lookup' || isSearching || companies.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        onLoadMore();
      }
    }, { threshold: 0.1 });

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [companies.length, isSearching, activeMode, onLoadMore]);

  const handleSubmit = () => {
    if (!onSearch) return;

    if (activeMode === 'discovery') {
       if (industry && city) onSearch('discovery', industry, city);
    } else if (activeMode === 'jobs') {
       if (role && jobCity) onSearch('jobs', role, jobCity);
    } else {
       if (companyName) onSearch('lookup', companyName, lookupCity || 'Anywhere'); 
    }
  };

  const getHotScoreColor = (score: number) => {
    if (score >= 80) return 'from-red-500 to-orange-500';
    if (score >= 60) return 'from-orange-400 to-amber-400';
    return 'from-neutral-400 to-neutral-500';
  };

  return (
    <div className="flex flex-col h-full">
      
      {/* Search Header Area - Fixed Top */}
      <div className="mb-2 space-y-4 relative z-10 bg-neutral-50 dark:bg-neutral-950 pb-2">
        <div className="flex items-center justify-between px-1">
             <h2 className="text-lg font-semibold text-neutral-900 dark:text-white tracking-tight">
               Search
             </h2>
             {/* Mode Toggles */}
             <div className="flex p-1 rounded-lg bg-neutral-200 dark:bg-white/5 border border-neutral-200 dark:border-white/5" role="tablist">
                 <button
                    onClick={() => onModeChange('discovery')}
                    role="tab"
                    aria-selected={activeMode === 'discovery'}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${activeMode === 'discovery' ? 'bg-white dark:bg-neutral-800 text-accent shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                 >
                    Leads
                 </button>
                 <button
                    onClick={() => onModeChange('jobs')}
                    role="tab"
                    aria-selected={activeMode === 'jobs'}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${activeMode === 'jobs' ? 'bg-white dark:bg-neutral-800 text-accent shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                 >
                    Jobs
                 </button>
                 <button
                    onClick={() => onModeChange('lookup')}
                    role="tab"
                    aria-selected={activeMode === 'lookup'}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${activeMode === 'lookup' ? 'bg-white dark:bg-neutral-800 text-accent shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                 >
                    Lookup
                 </button>
             </div>
        </div>
        
        <div className="space-y-3">
          {activeMode === 'discovery' && (
              <>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-4 w-4 text-neutral-400 group-focus-within:text-accent transition-colors duration-300" />
                    </div>
                    <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Industry (e.g. SaaS)"
                    aria-label="Industry"
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
                    aria-label="City"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="block w-full pl-10 pr-3 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all shadow-sm hover:shadow-md dark:hover:bg-neutral-800"
                    />
                </div>
              </>
          )}

          {activeMode === 'jobs' && (
              <>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserSearch className="h-4 w-4 text-neutral-400 group-focus-within:text-accent transition-colors duration-300" />
                    </div>
                    <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Role (e.g. Copywriter)"
                    aria-label="Role"
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
                    value={jobCity}
                    onChange={(e) => setJobCity(e.target.value)}
                    placeholder="City (e.g. Mumbai)"
                    aria-label="City"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="block w-full pl-10 pr-3 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all shadow-sm hover:shadow-md dark:hover:bg-neutral-800"
                    />
                </div>
              </>
          )}

          {activeMode === 'lookup' && (
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
                    aria-label="Company Name"
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
                    aria-label="City"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="block w-full pl-10 pr-3 py-3 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all shadow-sm hover:shadow-md dark:hover:bg-neutral-800"
                    />
                </div>
              </>
          )}

          <button 
            onClick={handleSubmit}
            disabled={
                isSearching || 
                (activeMode === 'discovery' ? (!industry || !city) : 
                 activeMode === 'jobs' ? (!role || !jobCity) : 
                 !companyName)
            }
            className={`
              w-full flex items-center justify-center py-3 px-4 rounded-xl font-medium transition-all duration-300 shadow-lg 
              ${isSearching || (activeMode === 'discovery' ? (!industry || !city) : activeMode === 'jobs' ? (!role || !jobCity) : !companyName)
                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed shadow-none' 
                : 'bg-accent hover:bg-accent-glow text-white shadow-accent/20 hover:shadow-accent/40 active:scale-[0.98]'}
            `}
          >
            {isSearching && companies.length === 0 ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {isSearching && companies.length === 0 ? (
                <span className="font-mono text-xs uppercase tracking-wide animate-pulse">{loadingText}</span>
            ) : (
                activeMode === 'discovery' ? 'Find Leads' : activeMode === 'jobs' ? 'Find Jobs' : 'Lookup'
            )}
          </button>
        </div>
      </div>

      {/* Soft Gradient Divider */}
      <div className="h-6 w-full bg-gradient-to-b from-neutral-50 via-neutral-50 to-transparent dark:from-neutral-950 dark:via-neutral-950 z-10 shrink-0"></div>

      {/* Results List - SCROLLABLE AREA */}
      <div id="results-container" className="flex-1 overflow-y-auto -mx-2 px-2 pb-4 space-y-3 min-h-0 custom-scrollbar">
        {isSearching && companies.length === 0 ? (
             <div className="space-y-3">
                 <SkeletonCard />
                 <SkeletonCard />
                 <SkeletonCard />
                 <SkeletonCard />
             </div>
        ) : (
            <>
                {companies.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-60 animate-fade-in p-8">
                    <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-900/50 flex items-center justify-center mb-4 ring-1 ring-neutral-200 dark:ring-white/5">
                        <Radar className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
                    Ready to Search
                    </h3>
                    <p className="text-xs text-neutral-500 max-w-[200px] leading-relaxed">
                        Enter your search criteria above to begin.
                    </p>
                </div>
                )}

                {companies.map((company, index) => {
                const isSelected = selectedCompanyId === company.id;
                const animationDelay = `${(index % 10) * 50}ms`;
                const hotColor = getHotScoreColor(company.hotScore);
                const openRolesCount = company.openRoles?.length || 0;
                
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
                        <div className="flex-1 mr-2 min-w-0">
                        <h3 className={`font-semibold text-sm transition-colors truncate ${isSelected ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-200 group-hover:text-neutral-900 dark:group-hover:text-white'}`}>
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
                                    onClick={(e) => e.stopPropagation()} 
                                    className="text-xs text-neutral-500 hover:text-accent hover:underline truncate max-w-[150px] transition-colors"
                                >
                                    {company.website.replace(/^https?:\/\/(www\.)?/, '')}
                                </a>
                                </>
                            )}
                        </div>
                        
                        {/* Display Open Roles clearly in Jobs mode */}
                        {activeMode === 'jobs' && company.openRoles && company.openRoles.length > 0 ? (
                             <div className="mt-3 space-y-1.5">
                                {company.openRoles.slice(0, 2).map((role, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-md border border-neutral-200 dark:border-white/5">
                                        <Briefcase className="w-3 h-3 text-accent shrink-0" />
                                        <span className="truncate">{role.title}</span>
                                        {role.salary && <span className="text-[10px] text-neutral-400 ml-auto font-mono">{role.salary}</span>}
                                    </div>
                                ))}
                                {company.openRoles.length > 2 && (
                                    <p className="text-[10px] text-neutral-400 pl-1">+{company.openRoles.length - 2} more roles</p>
                                )}
                             </div>
                        ) : (
                             openRolesCount > 0 && (
                                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase">
                                    <UserSearch className="w-3 h-3" />
                                    {openRolesCount} Open Role{openRolesCount !== 1 && 's'}
                                </div>
                             )
                        )}

                        </div>

                        {/* Hot Score Badge */}
                        <div className={`
                            flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-white shadow-sm shrink-0
                            bg-gradient-to-r ${hotColor}
                        `}>
                            <Flame className="w-3 h-3 fill-white/90" />
                            <span>{company.hotScore}%</span>
                        </div>
                    </div>
                    
                    {/* Active Indicator Slide-in */}
                    <div className={`
                        mt-3 flex items-center text-xs font-medium text-accent overflow-hidden transition-all duration-300 ease-out
                        ${isSelected ? 'max-h-6 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}
                    `}>
                        <span>Selected</span>
                        <ChevronRight className="w-3 h-3 ml-1" />
                    </div>
                    </div>
                );
                })}
                
                {/* Infinite Scroll Trigger Area */}
                {companies.length > 0 && (activeMode === 'discovery' || activeMode === 'jobs') && (
                <div ref={loadMoreRef} className="py-4 flex flex-col items-center justify-center opacity-70">
                    {isSearching ? (
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <Loader2 className="w-4 h-4 animate-spin text-accent" />
                            <span className="animate-pulse">Loading more results...</span>
                        </div>
                    ) : (
                        <div className="h-4"></div> // Spacer trigger
                    )}
                </div>
                )}
            </>
        )}

        {/* Verified Sources Footer */}
        {sources.length > 0 && (
          <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-white/10 opacity-70 hover:opacity-100 transition-opacity">
            <h4 className="text-[10px] font-bold uppercase text-neutral-500 mb-2">Verified Sources</h4>
            <div className="flex flex-wrap gap-2">
              {sources.map((source, idx) => (
                <a 
                  key={idx}
                  href={source.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-[10px] text-neutral-600 dark:text-neutral-400 hover:text-accent hover:border-accent/30 transition-colors truncate max-w-full"
                  title={source.title}
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">{source.title || new URL(source.uri).hostname}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
