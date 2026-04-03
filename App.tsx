
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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [activeSearchMode, setActiveSearchMode] = useState<SearchMode>('discovery');

  const [resultsCache, setResultsCache] = useState<Record<SearchMode, { leads: Company[], sources: Source[] }>>({
    discovery: { leads: [], sources: [] },
    jobs: { leads: [], sources: [] },
    lookup: { leads: [], sources: [] },
    people: { leads: [], sources: [] }
  });
  
  const searchParamsCacheRef = useRef<Record<SearchMode, SearchParams | null>>({
    discovery: null,
    jobs: null,
    lookup: null,
    people: null
  });

  const [savedCompanies, setSavedCompanies] = useState<Company[]>(() => 
    safeStorage.get<Company[]>('recon_saved_targets', [])
  );
  
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>(() => 
    safeStorage.get<SavedJob[]>('recon_saved_jobs', [])
  );

  const [nextBatch, setNextBatch] = useState<{ leads: Company[], sources: Source[] } | null>(null);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    safeStorage.set('recon_saved_targets', savedCompanies);
  }, [savedCompanies]);

  useEffect(() => {
    safeStorage.set('recon_saved_jobs', savedJobs);
  }, [savedJobs]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    document.documentElement.style.setProperty('--mouse-x', `${x}px`);
    document.documentElement.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  const prefetchNextBatch = async (currentResults: Company[], params: SearchParams) => {
    if (params.mode === 'lookup') return;
    setIsPrefetching(true);
    try {
        const excludeNames = [...currentResults.map(c => c.name), ...savedCompanies.map(c => c.name)];
        const nextParams = { ...params, excludeNames };
        const result = await findLeads(nextParams, abortControllerRef.current?.signal);
        setNextBatch(result);
    } catch (error: any) {
        if (error.name !== 'AbortError') console.log("Prefetch failed.");
    } finally {
        setIsPrefetching(false);
    }
  };

  const handleSearch = async (mode: SearchMode, p1: string, p2: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setIsSearching(true);
    setResultsCache(prev => ({ ...prev, [mode]: { leads: [], sources: [] } }));
    setNextBatch(null); 
    
    const params: SearchParams = {
        mode,
        industry: mode === 'discovery' ? p1 : undefined,
        city: p2,
        role: (mode === 'jobs' || mode === 'people') ? p1 : undefined,
        companyName: mode === 'lookup' ? p1 : undefined,
        excludeNames: savedCompanies.map(c => c.name)
    };
    
    searchParamsCacheRef.current[mode] = params;

    try {
      const cities = p2.split(',').map(c => c.trim()).filter(c => c.length > 0);
      let combinedLeads: Company[] = [];
      let combinedSources: Source[] = [];

      if (cities.length > 1 && mode !== 'lookup') {
        const targetCities = cities.slice(0, 3);
        const promises = targetCities.map(city => {
            const cityParams = { ...params, city };
            return findLeads(cityParams, abortControllerRef.current?.signal).catch(() => ({ leads: [], sources: [] }));
        });

        const results = await Promise.all(promises);
        results.forEach((res, index) => {
            const remappedLeads = res.leads.map((l, li) => ({ ...l, id: `merged-${index}-${li}-${Date.now()}` }));
            combinedLeads = [...combinedLeads, ...remappedLeads];
            combinedSources = [...combinedSources, ...res.sources];
        });
        combinedLeads = combinedLeads.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
        combinedSources = combinedSources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);
      } else {
        const { leads, sources } = await findLeads(params, abortControllerRef.current.signal);
        combinedLeads = leads;
        combinedSources = sources;
      }
      
      setResultsCache(prev => ({ ...prev, [mode]: { leads: combinedLeads, sources: combinedSources } }));
      if (combinedLeads.length > 0 && cities.length === 1) prefetchNextBatch(combinedLeads, params);
    } catch (error: any) {
      if (error.name !== 'AbortError') addToast(error.message || "Search failed.", "error");
    } finally {
      if (!abortControllerRef.current?.signal.aborted) setIsSearching(false);
    }
  };

  const handleLoadMore = async () => {
    const currentParams = searchParamsCacheRef.current[activeSearchMode];
    if (!currentParams || currentParams.mode === 'lookup') return;
    
    if (nextBatch && nextBatch.leads.length > 0) {
        const batchLeads = nextBatch.leads;
        const batchSources = nextBatch.sources;
        setNextBatch(null);
        setResultsCache(prev => {
            const currentModeData = prev[activeSearchMode];
            const updatedLeads = [...currentModeData.leads, ...batchLeads];
            prefetchNextBatch(updatedLeads, currentParams);
            const uniqueSources = [...currentModeData.sources, ...batchSources].filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);
            return { ...prev, [activeSearchMode]: { leads: updatedLeads, sources: uniqueSources } };
        });
        return;
    }

    setIsSearching(true);
    try {
      const currentLeads = resultsCache[activeSearchMode].leads;
      const excludeNames = [...currentLeads.map(c => c.name), ...savedCompanies.map(c => c.name)];
      const params: SearchParams = { ...currentParams, excludeNames };
      const { leads, sources } = await findLeads(params, abortControllerRef.current?.signal);
      if (leads.length > 0) {
         setResultsCache(prev => {
            const currentModeData = prev[activeSearchMode];
            const updatedLeads = [...currentModeData.leads, ...leads];
            prefetchNextBatch(updatedLeads, currentParams);
            const uniqueSources = [...currentModeData.sources, ...sources].filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);
            return { ...prev, [activeSearchMode]: { leads: updatedLeads, sources: uniqueSources } };
        });
      }
    } catch (error: any) {
       if (error.name !== 'AbortError') addToast(error.message || "Failed to load more.", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSaveCompany = (company: Company) => {
    if (savedCompanies.some(c => c.id === company.id)) {
        setSavedCompanies(prev => prev.filter(c => c.id !== company.id));
        addToast("Company removed", "info");
    } else {
        setSavedCompanies(prev => [{ ...company, status: 'Saved' }, ...prev]);
        addToast("Company saved", "success");
    }
  };

  const trackJob = (job: Job, company: Company) => {
      if (savedJobs.some(j => j.id === job.id)) return addToast("Already tracked", "info");
      setSavedJobs(prev => [{ ...job, companyId: company.id, companyName: company.name, status: 'Saved' }, ...prev]);
      if (!savedCompanies.some(c => c.id === company.id)) toggleSaveCompany(company);
      addToast("Job added to pipeline", "success");
  };

  const updateJobStatus = (jobId: string, status: any) => setSavedJobs(prev => prev.map(j => j.id === jobId ? { ...j, status } : j));
  const removeJobs = (jobIds: string[]) => {
      setSavedJobs(prev => prev.filter(j => !jobIds.includes(j.id)));
      addToast("Jobs removed", "info");
  };
  const removeMultipleSavedCompanies = (ids: string[]) => {
    setSavedCompanies(prev => prev.filter(c => !ids.includes(c.id)));
    if (selectedCompanyId && ids.includes(selectedCompanyId)) setSelectedCompanyId(null);
    addToast(`Deleted ${ids.length} leads`, "info");
  };

  const currentLeads = resultsCache[activeSearchMode].leads;
  const currentSources = resultsCache[activeSearchMode].sources;
  const selectedCompany = currentLeads.find(c => c.id === selectedCompanyId) || savedCompanies.find(c => c.id === selectedCompanyId) || null;

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="h-screen h-[100dvh] bg-neutral-50 dark:bg-neutral-950 transition-colors duration-400 overflow-hidden flex flex-col relative"
    >
      <VoiceMode isActive={isVoiceModeActive} onClose={() => setIsVoiceModeActive(false)} contextCompany={selectedCompany} />

      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end space-y-4 pointer-events-none">
         <div className="flex flex-col gap-2 pointer-events-auto items-end">
            {toasts.map(toast => <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />)}
         </div>
         <button onClick={() => setIsVoiceModeActive(true)} className="pointer-events-auto group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-accent to-accent-glow text-white shadow-lg shadow-accent/40 hover:scale-110 transition-all duration-300">
            <Mic className="w-6 h-6 relative z-10" />
         </button>
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 spotlight-bg opacity-100 transition-opacity duration-500"></div>
      </div>

      <div className="relative z-10 flex flex-col h-full min-h-0">
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} onVoiceToggle={() => setIsVoiceModeActive(true)} />

        <main className="flex-1 w-full max-w-screen-2xl mx-auto flex overflow-hidden min-h-0">
          {/* Fluid Sidebar: hidden on medium laptops to give room to search */}
          <div className="hidden xl:block w-72 h-full shrink-0 border-r border-neutral-200 dark:border-white/5">
             <Sidebar savedCompanies={savedCompanies} savedJobs={savedJobs} onSelectCompany={(c) => setSelectedCompanyId(c.id)} selectedCompanyId={selectedCompanyId} onRemoveCompanies={removeMultipleSavedCompanies} onUpdateJobStatus={updateJobStatus} onRemoveJobs={removeJobs} />
          </div>

           {showMobileSidebar && (
              <div className="fixed inset-0 z-[110] flex lg:hidden">
                  <div className="w-72 h-full bg-neutral-900 shadow-2xl animate-fade-in">
                     <Sidebar savedCompanies={savedCompanies} savedJobs={savedJobs} onSelectCompany={(c) => { setSelectedCompanyId(c.id); setShowMobileSidebar(false); }} selectedCompanyId={selectedCompanyId} onRemoveCompanies={removeMultipleSavedCompanies} onUpdateJobStatus={updateJobStatus} onRemoveJobs={removeJobs} />
                  </div>
                  <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileSidebar(false)}></div>
              </div>
           )}

          <div className="flex-1 flex flex-col lg:flex-row min-w-0 min-h-0">
            <div className="xl:hidden p-2 border-b border-neutral-200 dark:border-white/10 flex items-center justify-between bg-neutral-100/50 dark:bg-neutral-900/50">
               <button onClick={() => setShowMobileSidebar(true)} className="flex items-center gap-2 text-[10px] font-bold uppercase text-neutral-500">
                  <Menu className="w-4 h-4" /> Open Pipeline
               </button>
               <span className="text-[10px] text-accent font-mono">{savedCompanies.length} SAVED</span>
            </div>

            {/* Main Search Column: Flexible but with min-width for usability */}
            <div className={`
                flex-1 lg:flex-[3] flex flex-col h-full min-w-[320px] border-r border-neutral-200 dark:border-white/5 bg-white/30 dark:bg-neutral-950/30
                ${selectedCompanyId ? 'hidden lg:flex' : 'flex'} 
            `}>
              <div className="p-4 h-full flex flex-col min-h-0">
                <SearchPane companies={currentLeads} sources={currentSources} selectedCompanyId={selectedCompanyId} onSelectCompany={setSelectedCompanyId} onSearch={handleSearch} onLoadMore={handleLoadMore} isSearching={isSearching} activeMode={activeSearchMode} onModeChange={setActiveSearchMode} />
              </div>
            </div>

            {/* Intelligence Column: Flexible relative width */}
            <div className={`
                lg:flex-[4] xl:flex-[3] h-full flex-col bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md min-w-0
                ${selectedCompanyId ? 'flex fixed inset-0 z-40 lg:static lg:z-auto' : 'hidden lg:flex'}
            `}>
               {selectedCompanyId && (
                  <div className="lg:hidden p-4 border-b border-neutral-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-neutral-900">
                      <button onClick={() => setSelectedCompanyId(null)} className="text-sm font-medium text-neutral-500 flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 rotate-180" /> Back to results
                      </button>
                  </div>
               )}
               <div className="flex-1 h-full overflow-hidden p-4 min-h-0">
                  <IntelligencePane company={selectedCompany} onToggleSave={() => selectedCompany && toggleSaveCompany(selectedCompany)} isSaved={!!selectedCompany && savedCompanies.some(c => c.id === selectedCompany.id)} onTrackJob={(job) => selectedCompany && trackJob(job, selectedCompany)} savedJobs={savedJobs} />
               </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
