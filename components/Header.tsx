
import React from 'react';
import { Radar, Moon, Sun, Sparkles, Mic } from 'lucide-react';

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  onVoiceToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleTheme, onVoiceToggle }) => {
  return (
    <header className="sticky top-0 z-50 transition-colors duration-300 border-b bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-neutral-200 dark:border-white/10">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-default">
            <div className="absolute inset-0 bg-accent-glow rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
            <div className="relative p-2 bg-neutral-100 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-white/10 shadow-sm">
              <Radar className="w-5 h-5 text-neutral-900 dark:text-white transition-transform group-hover:rotate-45 duration-500" />
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white leading-none">
              Recon
            </h1>
            <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mt-1 tracking-wide uppercase">
              Lead Generation & Outreach
            </span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-4">
          
          <button
            onClick={onVoiceToggle}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 transition-all group"
          >
             <Mic className="w-4 h-4 group-hover:scale-110 transition-transform" />
             <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider">Voice Mode</span>
          </button>

          <div className="h-6 w-px bg-neutral-200 dark:bg-white/10 hidden md:block"></div>

          <div className="hidden md:flex items-center px-3 py-1 rounded-full bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10">
            <Sparkles className="w-3 h-3 text-neutral-400 mr-2" />
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">AI Active</span>
          </div>

          <button 
            onClick={toggleTheme}
            className="relative h-8 w-14 rounded-full bg-neutral-200 dark:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 group"
            aria-label="Toggle Theme"
          >
            <div className={`
              absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-sm flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]
              ${isDarkMode ? 'transform translate-x-6 rotate-180' : 'transform translate-x-0 rotate-0'}
            `}>
              {isDarkMode ? (
                <Moon className="w-3 h-3 text-neutral-900" />
              ) : (
                <Sun className="w-3 h-3 text-amber-500" />
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
