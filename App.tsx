

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { SearchPane } from './components/SearchPane';
import { IntelligencePane } from './components/IntelligencePane';
import { Sidebar } from './components/Sidebar';
import { VoiceMode } from './components/VoiceMode';
import { Company, SearchMode, SearchParams, Source, Job, SavedJob } from './types';
import { findLeads } from './services/geminiService';
import { safeStorage } from './utils/storage';
import { Menu, ChevronRight, X, Mic } from 'lucide-react';

// Simple Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div 
      role="alert"
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg shadow-black/20 border backdrop-blur-md animate-fade-in-up
        ${type === 'error' ? 'bg-red-500/90 text-white border-red-500' : 
          type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-500' : 
          'bg-neutral-800/90 text-white border-neutral-700'}
    `}>
      <span className="text-sm font-medium">{message}</span>
      <button 
        onClick={onClose} 
        aria-label="Close notification"
        className="opacity-70 hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  );
};

const App: React.FC = () => {
  // Initialize theme based on system preference
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  // Voice Mode State
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);

  // --- NEW: State for Tabs/Modes Data Caching ---
  const [activeSearchMode, setActiveSearchMode] = useState<SearchMode>('discovery');

  const [resultsCache, setResultsCache] = useState<Record<SearchMode, { leads: Company[], sources: Source[] }>>({
    discovery: { leads: [], sources: [] },
    jobs: { leads: [], sources: [] },
    lookup: { leads: [], sources: [] }
  });
  
  // Cache for params to support "Load More" on each tab independently
  const searchParamsCacheRef = useRef<Record<SearchMode, SearchParams | null>>({
    discovery: null,
    jobs: null,
    lookup: null
  });

  const [savedCompanies, setSavedCompanies] = useState<Company[]>(() => 
    safeStorage.get<Company[]>('recon_saved_targets', [])
  );
  
  // Job Tracking State
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>(() => 
    safeStorage.get<SavedJob[]>('recon_saved_jobs', [])
  );

  // Pre-fetching State
  const [nextBatch, setNextBatch] = useState<{ leads: Company[], sources: Source[] } | null>(null);
  const [isPrefetching, setIsPrefetching] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // Abort Controller Ref to handle cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Initialize theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  // Persist Data using Safe Storage
  useEffect(() => {
    safeStorage.set('recon_saved_targets', savedCompanies);
  }, [savedCompanies]);

  useEffect(() => {
    safeStorage.set('recon_saved_jobs', savedJobs);
  }, [savedJobs]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Mouse tracking
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    document.documentElement.style.setProperty('--mouse-x', `${x}px`);
    document.documentElement.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  // BACKGROUND TASK: Prefetch the next 5 leads
  const prefetchNextBatch = async (currentResults: Company[], params: SearchParams) => {
    if (params.mode === 'lookup') return; // Don't prefetch for single lookups
    
    setIsPrefetching(true);
    try {
        const excludeNames = [...currentResults.map(c => c.name), ...savedCompanies.map(c => c.name)];
        const nextParams = { ...params, excludeNames };
        
        const result = await findLeads(nextParams, abortControllerRef.current?.signal);
        setNextBatch(result);
    } catch (error: any) {
        if (error.name !== 'AbortError') {
            console.log("Prefetch suspended or failed (non-critical).");
        }
    } finally {
        setIsPrefetching(false);
    }
  };

  const handleSearch = async (mode: SearchMode, p1: string, p2: string) => {
    // 1. STOP EVERYTHING
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSearching(true);
    // Clear data for this specific mode only
    setResultsCache(prev => ({
        ...prev,
        [mode]: { leads: [], sources: [] }
    }));
    setNextBatch(null); 
    
    // Note: We do not clear selectedCompanyId here to keep context if switching, 
    // but if the new list doesn't have it, it will naturally disappear from view/selection logic below.
    
    const params: SearchParams = {
        mode,
        industry: mode === 'discovery' ? p1 : undefined,
        city: p2,
        role: mode === 'jobs' ? p1 : undefined,
        companyName: mode === 'lookup' ? p1 : undefined,
        excludeNames: savedCompanies.map(c => c.name)
    };
    
    // Cache params for this mode
    searchParamsCacheRef.current[mode] = params;

    try {
      const { leads, sources } = await findLeads(params, abortControllerRef.current.signal);
      
      setResultsCache(prev => ({
        ...prev,
        [mode]: { leads, sources }
      }));
      
      if (leads.length === 0) {
        addToast("No leads found. Try a broader search.", "info");
      } else {
        prefetchNextBatch(leads, params);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
          console.log("Search aborted by user.");
      } else {
          console.error("Search failed", error);
          addToast(error.message || "Could not find leads.", "error");
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
          setIsSearching(false);
      }
    }
  };

  const handleLoadMore = async () => {
    const currentParams = searchParamsCacheRef.current[activeSearchMode];
    if (!currentParams || currentParams.mode === 'lookup') return;
    
    // STRATEGY: Instant Load if buffer is ready
    if (nextBatch && nextBatch.leads.length > 0) {
        const batchLeads = nextBatch.leads;
        const batchSources = nextBatch.sources;
        
        setNextBatch(null); // Clear buffer immediately
        
        setResultsCache(prev => {
            const currentModeData = prev[activeSearchMode];
            const updatedLeads = [...currentModeData.leads, ...batchLeads];
            
            // Trigger next prefetch
            prefetchNextBatch(updatedLeads, currentParams);
            
            // Dedupe sources
            const combinedSources = [...currentModeData.sources, ...batchSources];
            const uniqueSources = combinedSources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);

            return {
                ...prev,
                [activeSearchMode]: { leads: updatedLeads, sources: uniqueSources }
            };
        });
        return;
    }

    // Fallback
    setIsSearching(true);
    try {
      const currentLeads = resultsCache[activeSearchMode].leads;
      const excludeNames = [...currentLeads.map(c => c.name), ...savedCompanies.map(c => c.name)];
      const params: SearchParams = { ...currentParams, excludeNames };
      
      const { leads, sources } = await findLeads(params, abortControllerRef.current?.signal);
      
      if (leads.length === 0) {
        addToast("No more unique leads found in this area.", "info");
      } else {
         setResultsCache(prev => {
            const currentModeData = prev[activeSearchMode];
            const updatedLeads = [...currentModeData.leads, ...leads];
            
            prefetchNextBatch(updatedLeads, currentParams);
            
            const combinedSources = [...currentModeData.sources, ...sources];
            const uniqueSources = combinedSources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);

            return {
                ...prev,
                [activeSearchMode]: { leads: updatedLeads, sources: uniqueSources }
            };
        });
      }
    } catch (error: any) {
       if (error.name !== 'AbortError') {
          addToast(error.message || "Failed to load more leads.", "error");
       }
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSaveCompany = (company: Company) => {
    if (savedCompanies.some(c => c.id === company.id)) {
        // Remove
        setSavedCompanies(prev => prev.filter(c => c.id !== company.id));
        addToast("Company removed from saved list", "info");
    } else {
        // Add
        const newCompany = { ...company, status: 'Saved' as const };
        setSavedCompanies(prev => [newCompany, ...prev]);
        addToast("Company saved successfully", "success");
    }
  };

  const trackJob = (job: Job, company: Company) => {
      const existing = savedJobs.find(j => j.id === job.id);
      if (existing) {
          addToast("Job already tracked.", "info");
          return;
      }
      const newJob: SavedJob = {
          ...job,
          companyId: company.id,
          companyName: company.name,
          status: 'Saved'
      };
      setSavedJobs(prev => [newJob, ...prev]);
      
      // Auto-save company if not saved
      if (!savedCompanies.some(c => c.id === company.id)) {
          toggleSaveCompany(company);
      }
      
      addToast("Job added to pipeline.", "success");
  };

  const updateJobStatus = (jobId: string, status: 'Saved' | 'Applied' | 'Interviewing' | 'Offer') => {
      setSavedJobs(prev => prev.map(j => j.id === jobId ? { ...j, status } : j));
  };
  
  const removeJobs = (jobIds: string[]) => {
      setSavedJobs(prev => prev.filter(j => !jobIds.includes(j.id)));
      addToast("Jobs removed from pipeline.", "info");
  };

  const removeMultipleSavedCompanies = (ids: string[]) => {
    setSavedCompanies(prev => prev.filter(c => !ids.includes(c.id)));
    if (selectedCompanyId && ids.includes(selectedCompanyId)) {
        setSelectedCompanyId(null);
    }
    addToast(`Deleted ${ids.length} companies`, "info");
  };

  // Determine current dataset based on active mode
  const currentLeads = resultsCache[activeSearchMode].leads;
  const currentSources = resultsCache[activeSearchMode].sources;

  const selectedCompany = 
    currentLeads.find(c => c.id === selectedCompanyId) || 
    savedCompanies.find(c => c.id === selectedCompanyId) || 
    null;

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-400 overflow-hidden flex flex-col relative"
    >
      {/* Voice Mode Overlay */}
      <VoiceMode 
        isActive={isVoiceModeActive} 
        onClose={() => setIsVoiceModeActive(false)} 
        contextCompany={selectedCompany} 
      />

      {/* Floating Action Button for Voice - High Z-Index to Ensure Visibility */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end space-y-4 pointer-events-none">
         {/* Toast Area */}
         <div className="flex flex-col gap-2 pointer-events-auto items-end">
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
            ))}
         </div>

         {/* FAB */}
         <button
            onClick={() => setIsVoiceModeActive(true)}
            aria-label="Start Voice Assistant"
            className="pointer-events-auto group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-accent to-accent-glow text-white shadow-lg shadow-accent/40 hover:scale-110 hover:shadow-accent/60 transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-accent/30"
         >
            <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 animate-ping duration-1000"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-accent to-accent-glow opacity-80 blur-md"></div>
            <Mic className="w-6 h-6 relative z-10 drop-shadow-sm" />
         </button>
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] transition-opacity duration-1000 ${isDarkMode ? 'bg-accent/5' : 'bg-accent/10'}`}></div>
        <div className="absolute inset-0 spotlight-bg opacity-100 transition-opacity duration-500"></div>
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <Header 
            isDarkMode={isDarkMode} 
            toggleTheme={toggleTheme} 
            onVoiceToggle={() => setIsVoiceModeActive(true)}
        />

        <main className="flex-1 w-full max-w-screen-2xl mx-auto flex overflow-hidden">
          
          <div className="hidden lg:block w-72 h-full shrink-0">
             <Sidebar 
                savedCompanies={savedCompanies}
                savedJobs={savedJobs}
                onSelectCompany={(c) => setSelectedCompanyId(c.id)}
                selectedCompanyId={selectedCompanyId}
                onRemoveCompanies={removeMultipleSavedCompanies}
                onUpdateJobStatus={updateJobStatus}
                onRemoveJobs={removeJobs}
             />
          </div>

           {showMobileSidebar && (
              <div className="fixed inset-0 z-50 lg:hidden flex">
                  <div className="w-72 h-full bg-neutral-900 shadow-2xl animate-fade-in">
                     <Sidebar 
                        savedCompanies={savedCompanies}
                        savedJobs={savedJobs}
                        onSelectCompany={(c) => { setSelectedCompanyId(c.id); setShowMobileSidebar(false); }}
                        selectedCompanyId={selectedCompanyId}
                        onRemoveCompanies={removeMultipleSavedCompanies}
                        onUpdateJobStatus={updateJobStatus}
                        onRemoveJobs={removeJobs}
                     />
                  </div>
                  <div 
                    className="flex-1 bg-black/50 backdrop-blur-sm" 
                    onClick={() => setShowMobileSidebar(false)}
                    aria-label="Close Sidebar"
                  ></div>
              </div>
           )}

          <div className="flex-1 flex flex-col lg:flex-row min-w-0">
            
            <div className="lg:hidden p-2 border-b border-neutral-200 dark:border-white/10 flex items-center justify-between bg-neutral-100/50 dark:bg-neutral-900/50">
               <button 
                onClick={() => setShowMobileSidebar(true)} 
                aria-label="Open Saved List"
                className="flex items-center gap-2 text-xs font-bold uppercase text-neutral-500"
               >
                  <Menu className="w-4 h-4" /> Open Saved List
               </button>
               <span className="text-[10px] text-accent font-mono">{savedCompanies.length} SAVED</span>
            </div>

            <div className={`
                flex-1 flex flex-col h-full min-w-0 border-r border-neutral-200 dark:border-white/5 bg-white/30 dark:bg-neutral-950/30
                ${selectedCompanyId ? 'hidden lg:flex' : 'flex'} 
            `}>
              <div className="p-4 h-full">
                <SearchPane 
                    companies={currentLeads} 
                    sources={currentSources}
                    selectedCompanyId={selectedCompanyId}
                    onSelectCompany={setSelectedCompanyId}
                    onSearch={handleSearch}
                    onLoadMore={handleLoadMore}
                    isSearching={isSearching}
                    activeMode={activeSearchMode}
                    onModeChange={setActiveSearchMode}
                />
              </div>
            </div>

            <div className={`
                lg:w-[600px] xl:w-[700px] h-full flex-col bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md
                ${selectedCompanyId ? 'flex fixed inset-0 z-40 lg:static lg:z-auto' : 'hidden lg:flex'}
            `}>
               {selectedCompanyId && (
                  <div className="lg:hidden p-4 border-b border-neutral-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-neutral-900">
                      <button 
                          onClick={() => setSelectedCompanyId(null)}
                          className="text-sm font-medium text-neutral-500 flex items-center gap-2"
                      >
                          <ChevronRight className="w-4 h-4 rotate-180" /> Back
                      </button>
                  </div>
               )}
               
               <div className="flex-1 h-full overflow-hidden p-4">
                  <IntelligencePane 
                      company={selectedCompany} 
                      onToggleSave={() => selectedCompany && toggleSaveCompany(selectedCompany)}
                      isSaved={!!selectedCompany && savedCompanies.some(c => c.id === selectedCompany.id)}
                      onTrackJob={(job) => selectedCompany && trackJob(job, selectedCompany)}
                      savedJobs={savedJobs}
                  />
               </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
