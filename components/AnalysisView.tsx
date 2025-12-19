
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Terminal, Copy, Check } from 'lucide-react';
import { AnalysisResult, AppState } from '../types';

interface AnalysisViewProps {
  state: AppState;
  result: AnalysisResult | null;
  error: string | null;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ state, result, error }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (state === AppState.IDLE && !result) {
    return (
      <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-neutral-500 border border-neutral-700/30 rounded-lg bg-neutral-900/30 p-8">
        <Terminal className="w-12 h-12 mb-4 opacity-50" />
        <p className="font-mono text-sm text-center">READY FOR ANALYSIS</p>
        <p className="text-xs text-center mt-2 opacity-50 max-w-xs">Upload an image to begin analysis.</p>
      </div>
    );
  }

  if (state === AppState.ANALYZING) {
    return (
      <div className="h-full min-h-[300px] relative overflow-hidden rounded-lg border border-accent/30 bg-neutral-900 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4 z-20">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-neutral-700 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-accent rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>
            <div className="font-mono text-accent text-sm animate-pulse">
                PROCESSING IMAGE...
            </div>
            <div className="font-mono text-xs text-neutral-500">
                ANALYZING CONTENT
            </div>
        </div>
        
        {/* Background text scrolling effect */}
        <div className="absolute inset-0 opacity-10 font-mono text-[10px] leading-3 overflow-hidden text-accent select-none pointer-events-none p-2 break-all">
            {Array(100).fill("010101101 ANALYZING... ").join(" ")}
        </div>
      </div>
    );
  }

  if (state === AppState.ERROR || error) {
    return (
      <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-red-500 border border-red-900/50 rounded-lg bg-red-900/10 p-8">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="font-mono font-bold text-lg mb-2">SYSTEM ERROR</h3>
        <p className="text-sm font-mono text-center opacity-80">{error || "Unknown Error"}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border border-neutral-700 rounded-lg bg-neutral-900 overflow-hidden shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700 bg-neutral-800/20">
        <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-accent"></div>
            <span className="text-xs font-mono font-bold text-neutral-200 tracking-wider">ANALYSIS RESULTS</span>
        </div>
        <div className="flex items-center space-x-3">
             <span className="text-[10px] font-mono text-neutral-500">{result?.timestamp}</span>
             <button 
                onClick={handleCopy}
                className="text-neutral-500 hover:text-accent transition-colors"
                title="Copy Report"
             >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
             </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed text-gray-300">
        <ReactMarkdown 
            components={{
                h1: ({node, ...props}) => <h1 className="text-xl font-bold text-accent mb-4 border-b border-accent/30 pb-2 uppercase tracking-wide" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg font-bold text-white mb-3 mt-6 uppercase" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-md font-bold text-gray-200 mb-2 mt-4" {...props} />,
                p: ({node, ...props}) => <p className="mb-4 text-justify" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-1 text-gray-400" {...props} />,
                li: ({node, ...props}) => <li className="ml-4" {...props} />,
                strong: ({node, ...props}) => <strong className="text-accent font-bold" {...props} />,
                code: ({node, ...props}) => <code className="bg-neutral-800 px-1 py-0.5 rounded text-xs" {...props} />,
            }}
        >
            {result?.text || ""}
        </ReactMarkdown>
      </div>
      
      <div className="px-4 py-2 border-t border-neutral-700 bg-black text-[10px] text-neutral-500 font-mono flex justify-between">
         <span>CONFIDENCE: HIGH</span>
         <span>VERIFIED</span>
      </div>
    </div>
  );
};