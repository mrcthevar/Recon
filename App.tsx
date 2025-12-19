
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { SearchPane } from './components/SearchPane';
import { IntelligencePane } from './components/IntelligencePane';
import { Sidebar } from './components/Sidebar';
import { Company, SearchMode, SearchParams, Source } from './types';
import { findLeads } from './services/geminiService';
import { Menu, ChevronRight, X } from 'lucide-react';

// Simple Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`
        flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg shadow-black/20 border backdrop-blur-md animate-fade-in-up
        ${type === 'error' ? 'bg-red-500/90 text-white border-red-500' : 
          type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-500' : 
          'bg-neutral-800/90 text-white border-neutral-700'}
    `}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity"><X size={14} /></button>
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
  
  // State for Live Results vs Saved Targets
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [searchSources, setSearchSources] = useState<Source[]>([]);
  
  const [savedCompanies, setSavedCompanies] = useState<Company[]>(() => {
    // Basic persistence
    const saved = localStorage.getItem('recon_saved_targets');
    return saved ? JSON.parse(saved) : [];
  });

  // Pre-fetching State
  const [nextBatch, setNextBatch] = useState<{ leads: Company[], sources: Source[] } | null>(null);
  const [isPrefetching, setIsPrefetching] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  const currentSearchParamsRef = useRef<SearchParams | null>(null);
  
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

  // Persist Saved Companies
  useEffect(() => {
    localStorage.setItem('recon_saved_targets', JSON.stringify(savedCompanies));
  }, [savedCompanies]);

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
    setSearchResults([]); 
    setSearchSources([]);
    setNextBatch(null); 
    setSelectedCompanyId(null);
    
    const params: SearchParams = {
        mode,
        industry: mode === 'discovery' ? p1 : undefined,
        city: p2,
        companyName: mode === 'lookup' ? p1 : undefined,
        excludeNames: savedCompanies.map(c => c.name)
    };
    currentSearchParamsRef.current = params;

    try {
      const { leads, sources } = await findLeads(params, abortControllerRef.current.signal);
      setSearchResults(leads);
      setSearchSources(sources);
      
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
    if (!currentSearchParamsRef.current || currentSearchParamsRef.current.mode === 'lookup') return;
    
    // STRATEGY: Instant Load if buffer is ready
    if (nextBatch && nextBatch.leads.length > 0) {
        const batchLeads = nextBatch.leads;
        const batchSources = nextBatch.sources;
        
        setNextBatch(null); // Clear buffer immediately
        
        setSearchResults(prev => {
            const updated = [...prev, ...batchLeads];
            prefetchNextBatch(updated, currentSearchParamsRef.current!); 
            return updated;
        });
        setSearchSources(prev => {
            // Merge and dedupe sources
            const combined = [...prev, ...batchSources];
            return combined.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);
        });
        return;
    }

    // Fallback
    setIsSearching(true);
    try {
      const excludeNames = [...searchResults.map(c => c.name), ...savedCompanies.map(c => c.name)];
      const params: SearchParams = { ...currentSearchParamsRef.current, excludeNames };
      
      const { leads, sources } = await findLeads(params, abortControllerRef.current?.signal);
      
      if (leads.length === 0) {
        addToast("No more unique leads found in this area.", "info");
      } else {
        setSearchResults(prev => {
            const updated = [...prev, ...leads];
            prefetchNextBatch(updated, currentSearchParamsRef.current!);
            return updated;
        });
        setSearchSources(prev => {
             const combined = [...prev, ...sources];
             return combined.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);
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

  const removeMultipleSavedCompanies = (ids: string[]) => {
    setSavedCompanies(prev => prev.filter(c => !ids.includes(c.id)));
    if (selectedCompanyId && ids.includes(selectedCompanyId)) {
        setSelectedCompanyId(null);
    }
    addToast(`Deleted ${ids.length} companies`, "info");
  };

  const selectedCompany = 
    searchResults.find(c => c.id === selectedCompanyId) || 
    savedCompanies.find(c => c.id === selectedCompanyId) || 
    null;

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-400 overflow-hidden flex flex-col relative"
    >
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          <div className="pointer-events-auto flex flex-col gap-2">
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
            ))}
          </div>
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] transition-opacity duration-1000 ${isDarkMode ? 'bg-accent/5' : 'bg-accent/10'}`}></div>
        <div className="absolute inset-0 spotlight-bg opacity-100 transition-opacity duration-500"></div>
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

        <main className="flex-1 w-full max-w-screen-2xl mx-auto flex overflow-hidden">
          
          <div className="hidden lg:block w-72 h-full shrink-0">
             <Sidebar 
                savedCompanies={savedCompanies}
                onSelectCompany={(c) => setSelectedCompanyId(c.id)}
                selectedCompanyId={selectedCompanyId}
                onRemoveCompanies={removeMultipleSavedCompanies}
             />
          </div>

           {showMobileSidebar && (
              <div className="fixed inset-0 z-50 lg:hidden flex">
                  <div className="w-72 h-full bg-neutral-900 shadow-2xl animate-fade-in">
                     <Sidebar 
                        savedCompanies={savedCompanies}
                        onSelectCompany={(c) => { setSelectedCompanyId(c.id); setShowMobileSidebar(false); }}
                        selectedCompanyId={selectedCompanyId}
                        onRemoveCompanies={removeMultipleSavedCompanies}
                     />
                  </div>
                  <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileSidebar(false)}></div>
              </div>
           )}

          <div className="flex-1 flex flex-col lg:flex-row min-w-0">
            
            <div className="lg:hidden p-2 border-b border-neutral-200 dark:border-white/10 flex items-center justify-between bg-neutral-100/50 dark:bg-neutral-900/50">
               <button onClick={() => setShowMobileSidebar(true)} className="flex items-center gap-2 text-xs font-bold uppercase text-neutral-500">
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
                    companies={searchResults} 
                    sources={searchSources}
                    selectedCompanyId={selectedCompanyId}
                    onSelectCompany={setSelectedCompanyId}
                    onSearch={handleSearch}
                    onLoadMore={handleLoadMore}
                    isSearching={isSearching}
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
