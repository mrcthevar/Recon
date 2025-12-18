import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SearchPane } from './components/SearchPane';
import { IntelligencePane } from './components/IntelligencePane';
import { Company } from './types';
import { findLeads } from './services/geminiService';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Mouse tracking for spotlight effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    document.documentElement.style.setProperty('--mouse-x', `${x}px`);
    document.documentElement.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  const handleSearch = async (industry: string, city: string) => {
    if (!industry || !city) return;
    setIsSearching(true);
    setCompanies([]); // Clear previous results while searching
    try {
      const newLeads = await findLeads(industry, city);
      setCompanies(newLeads);
      if (newLeads.length > 0) {
        setSelectedCompanyId(null); // Reset selection
      } else {
        alert(`No leads found for ${industry} in ${city}. Try a broader search.`);
      }
    } catch (error: any) {
      console.error("Search failed", error);
      // Show the actual error message from the backend for easier debugging
      alert(error.message || "Could not find leads. Please check API Key configuration.");
    } finally {
      setIsSearching(false);
    }
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || null;

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-400 selection:bg-accent selection:text-white overflow-hidden flex flex-col relative"
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

        <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-64px)] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            
            {/* Left: Search & Leads */}
            <div className="lg:col-span-4 h-full overflow-hidden flex flex-col">
              <SearchPane 
                  companies={companies} 
                  selectedCompanyId={selectedCompanyId}
                  onSelectCompany={setSelectedCompanyId}
                  onSearch={handleSearch}
                  isSearching={isSearching}
              />
            </div>

            {/* Right: Intelligence */}
            <div className="hidden lg:block lg:col-span-8 h-full overflow-hidden">
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
                  <div className="flex-1 p-4">
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