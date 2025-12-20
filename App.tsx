

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

  // State for Live Results vs Saved Targets
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [searchSources, setSearchSources] = useState<Source[]>([]);
  
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
    setSearchResults([]); 
    setSearchSources([]);
    setNextBatch(null); 
    setSelectedCompanyId(null);
    
    // MAPPING ARGS TO PARAMS
    // Discovery: p1=Industry, p2=City
    // Jobs: p1=Role, p2=City
    // Lookup: p1=CompanyName, p2=City
    
    const params: SearchParams = {
        mode,
        industry: mode === 'discovery' ? p1 : undefined,
        city: p2,
        role: mode === 'jobs' ? p1 : undefined,
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
            prefetchNext