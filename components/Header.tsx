import React from 'react';
import { Radar, Moon, Sun, Sparkles } from 'lucide-react';

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleTheme }) => {
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
              Sales Intelligence for Creators
            </span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center px-3 py-1 rounded-full bg-accent-dim border border-accent/20">
            <Sparkles className="w-3 h-3 text-accent mr-2 animate-pulse" />
            <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">AI Powered</span>
          </div>

          <div className="h-6 w-px bg-neutral-200 dark:bg-white/10"></div>

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
