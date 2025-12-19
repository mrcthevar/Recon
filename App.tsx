import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { SearchPane } from './components/SearchPane';
import { IntelligencePane } from './components/IntelligencePane';
import { Sidebar } from './components/Sidebar';
import { Company, SearchMode, SearchParams } from './types';
import { findLeads } from './services/geminiService';
import { Menu, X, ChevronRight } from 'lucide-react';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  // State for Live Results vs Saved Targets
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [savedCompanies, setSavedCompanies] = useState<Company[]>(() => {
    // Basic persistence
    const saved = localStorage.getItem('recon_saved_targets');
    return saved ? JSON.parse(saved) : [];
  });

  const [isSearching, setIsSearching] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  const currentSearchParamsRef = useRef<SearchParams | null>(null);
  const previousCompanyCountRef = useRef(0);

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

  const handleSearch = async (mode: SearchMode, p1: string, p2: string) => {
    setIsSearching(true);
    setSearchResults([]); 
    previousCompanyCountRef.current = 0;
    setSelectedCompanyId(null);
    
    const params: SearchParams = {
        mode,
        industry: mode === 'discovery' ? p1 : undefined,
        city: p2,
        companyName: mode === 'lookup' ? p1 : undefined,
        // Exclude saved companies from new search results to avoid dupes
        excludeNames: savedCompanies.map(c => c.name)
    };
    currentSearchParamsRef.current = params;

    try {
      const newLeads = await findLeads(params);
      setSearchResults(newLeads);
      if (newLeads.length === 0) {
        alert(`No leads found. Try a broader search.`);
      }
    } catch (error: any) {
      console.error("Search failed", error);
      alert(error.message || "Could not find leads.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMore = async () => {
    if (!currentSearchParamsRef.current || currentSearchParamsRef.current.mode === 'lookup') return;
    setIsSearching(true);
    try {
      const excludeNames = [...searchResults.map(c => c.name), ...savedCompanies.map(c => c.name)];
      const params: SearchParams = { ...currentSearchParamsRef.current, excludeNames };
      const moreLeads = await findLeads(params);
      
      if (moreLeads.length === 0) {
        alert("No more unique leads found in this area.");
      } else {
        setSearchResults(prev => [...prev, ...moreLeads]);
      }
    } catch (error: any) {
      alert(error.message || "Failed to load more leads.");
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSaveCompany = (company: Company) => {
    if (savedCompanies.some(c => c.id === company.id)) {
        // Remove
        setSavedCompanies(prev => prev.filter(c => c.id !== company.id));
    } else {
        // Add
        const newCompany = { ...company, status: 'Saved' as const };
        setSavedCompanies(prev => [newCompany, ...prev]);
        // Optionally remove from search results if you want them to 'move' to sidebar
        // setSearchResults(prev => prev.filter(c => c.id !== company.id));
    }
  };

  const removeSavedCompany = (id: string) => {
    setSavedCompanies(prev => prev.filter(c => c.id !== id));
    if (selectedCompanyId === id) setSelectedCompanyId(null);
  };

  // Determine which company is currently active
  const selectedCompany = 
    searchResults.find(c => c.id === selectedCompanyId) || 
    savedCompanies.find(c => c.id === selectedCompanyId) || 
    null;

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-400 overflow-hidden flex flex-col relative"
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] transition-opacity duration-1000 ${isDarkMode ? 'bg-accent/5' : 'bg-accent/10'}`}></div>
        <div className="absolute inset-0 spotlight-bg opacity-100 transition-opacity duration-500"></div>
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

        <main className="flex-1 w-full max-w-screen-2xl mx-auto flex overflow-hidden">
          
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block w-64 h-full shrink-0">
             <Sidebar 
                savedCompanies={savedCompanies}
                onSelectCompany={(c) => setSelectedCompanyId(c.id)}
                selectedCompanyId={selectedCompanyId}
                onRemoveCompany={removeSavedCompany}
             />
          </div>

           {/* Sidebar - Mobile Drawer */}
           {showMobileSidebar && (
              <div className="fixed inset-0 z-50 lg:hidden flex">
                  <div className="w-64 h-full bg-neutral-900 shadow-2xl animate-fade-in">
                     <Sidebar 
                        savedCompanies={savedCompanies}
                        onSelectCompany={(c) => { setSelectedCompanyId(c.id); setShowMobileSidebar(false); }}
                        selectedCompanyId={selectedCompanyId}
                        onRemoveCompany={removeSavedCompany}
                     />
                  </div>
                  <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileSidebar(false)}></div>
              </div>
           )}

          <div className="flex-1 flex flex-col lg:flex-row min-w-0">
            
            {/* Mobile Sidebar Toggle */}
            <div className="lg:hidden p-2 border-b border-neutral-200 dark:border-white/10 flex items-center justify-between bg-neutral-100/50 dark:bg-neutral-900/50">
               <button onClick={() => setShowMobileSidebar(true)} className="flex items-center gap-2 text-xs font-bold uppercase text-neutral-500">
                  <Menu className="w-4 h-4" /> Open War Room
               </button>
               <span className="text-[10px] text-accent font-mono">{savedCompanies.length} TARGETS</span>
            </div>

            {/* Middle: Live Search Results */}
            <div className={`
                flex-1 flex flex-col h-full min-w-0 border-r border-neutral-200 dark:border-white/5 bg-white/30 dark:bg-neutral-950/30
                ${selectedCompanyId ? 'hidden lg:flex' : 'flex'} 
            `}>
              <div className="p-4 h-full">
                <SearchPane 
                    companies={searchResults} 
                    selectedCompanyId={selectedCompanyId}
                    onSelectCompany={setSelectedCompanyId}
                    onSearch={handleSearch}
                    onLoadMore={handleLoadMore}
                    isSearching={isSearching}
                />
              </div>
            </div>

            {/* Right: Intelligence Pane (Dossier) */}
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