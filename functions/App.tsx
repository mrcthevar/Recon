import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { SearchPane } from './components/SearchPane';
import { IntelligencePane } from './components/IntelligencePane';
import { Company, SearchMode, SearchParams } from './types';
import { findLeads } from './services/geminiService';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Keep track of current search params for "Load More"
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

  // Scroll logic for new items
  useEffect(() => {
    if (companies.length > previousCompanyCountRef.current && previousCompanyCountRef.current > 0) {
        setTimeout(() => {
            const container = document.getElementById('results-container');
            if (container) {
                 container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }
        }, 100);
    }
    previousCompanyCountRef.current = companies.length;
  }, [companies]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Mouse tracking for spotlight effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    document.documentElement.style.setProperty('--mouse-x', `${x}px`);
    document.documentElement.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  const handleSearch = async (mode: SearchMode, p1: string, p2: string) => {
    setIsSearching(true);
    setCompanies([]); // Clear previous results for new search
    previousCompanyCountRef.current = 0;
    
    const params: SearchParams = {
        mode,
        industry: mode === 'discovery' ? p1 : undefined,
        city: p2,
        companyName: mode === 'lookup' ? p1 : undefined
    };
    currentSearchParamsRef.current = params;

    try {
      const newLeads = await findLeads(params);
      setCompanies(newLeads);
      if (newLeads.length > 0) {
        setSelectedCompanyId(null); 
      } else {
        alert(`No leads found. Try a broader search.`);
      }
    } catch (error: any) {
      console.error("Search failed", error);
      alert(error.message || "Could not find leads. Please check API Key configuration.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMore = async () => {
    if (!currentSearchParamsRef.current || currentSearchParamsRef.current.mode === 'lookup') return;

    setIsSearching(true);
    try {
      // Pass existing names to exclude them from next batch
      const excludeNames = companies.map(c => c.name);
      
      const params: SearchParams = {
          ...currentSearchParamsRef.current,
          excludeNames
      };

      const moreLeads = await findLeads(params);
      
      if (moreLeads.length === 0) {
        alert("No more unique leads found in this area.");
      } else {
        setCompanies(prev => [...prev, ...moreLeads]);
      }
    } catch (error: any) {
      console.error("Load more failed", error);
      alert(error.message || "Failed to load more leads.");
    } finally {
      setIsSearching(false);
    }
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || null;

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-400 selection:bg-accent selection:text-white overflow-hidden flex flex-col relative"
    >
      
      {/* Background Ambience & Spotlight */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         {/* Static Ambience */}
        {isDarkMode ? (
           <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-accent/5 blur-[120px] transition-opacity duration-1000"></div>
        ) : (
           <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[120px] transition-opacity duration-1000"></div>
        )}
        
        {/* Dynamic Interactive Spotlight */}
        <div className="absolute inset-0 spotlight-bg opacity-100 transition-opacity duration-500"></div>
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

        <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0">
            
            {/* Left: Search & Leads */}
            <div className="lg:col-span-4 h-full flex flex-col min-h-0">
              <SearchPane 
                  companies={companies} 
                  selectedCompanyId={selectedCompanyId}
                  onSelectCompany={setSelectedCompanyId}
                  onSearch={handleSearch}
                  onLoadMore={handleLoadMore}
                  isSearching={isSearching}
              />
            </div>

            {/* Right: Intelligence */}
            <div className="hidden lg:block lg:col-span-8 h-full min-h-0">
              <IntelligencePane company={selectedCompany} />
            </div>

            {/* Mobile View Handling (Stacking) */}
            {selectedCompanyId && (
              <div className="lg:hidden fixed inset-0 z-40 bg-neutral-50 dark:bg-neutral-950 flex flex-col animate-fade-in-up">
                  <div className="p-4 border-b border-neutral-200 dark:border-white/10 flex items-center bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md">
                      <button 
                          onClick={() => setSelectedCompanyId(null)}
                          className="text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                      >
                          ← Back to Search
                      </button>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto">
                      <IntelligencePane company={selectedCompany} />
                  </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

export default App;