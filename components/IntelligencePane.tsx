import React, { useState } from 'react';
import { Target, Send, Loader2, Sparkles, Copy, Check, Bot, Phone, Mail, Award } from 'lucide-react';
import { Company } from '../types';
import { generatePitch } from '../services/geminiService';

interface IntelligencePaneProps {
  company: Company | null;
}

export const IntelligencePane: React.FC<IntelligencePaneProps> = ({ company }) => {
  const [skills, setSkills] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPitch, setGeneratedPitch] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!company || !skills) return;

    setIsGenerating(true);
    setGeneratedPitch(null);
    try {
      const result = await generatePitch({
        companyName: company.name,
        industry: company.industry,
        userSkills: skills,
        tone: 'Professional'
      });
      setGeneratedPitch(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedPitch) {
      navigator.clipboard.writeText(generatedPitch);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!company) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-400 animate-fade-in select-none">
        <div className="w-20 h-20 rounded-3xl bg-neutral-100 dark:bg-neutral-900/50 flex items-center justify-center mb-6 shadow-inner ring-1 ring-neutral-200 dark:ring-white/5">
          <Target className="w-8 h-8 opacity-20" />
        </div>
        <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-2">Ready to Scout</h3>
        <p className="text-sm max-w-xs text-center leading-relaxed opacity-60">Select a company from the list to analyze their needs and draft a high-impact strategy.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in-up">
      
      {/* The Scout Card */}
      <section className="glass-panel rounded-2xl border border-neutral-200 dark:border-white/10 bg-white/60 dark:bg-neutral-900/60 p-6 shadow-soft transition-all hover:border-neutral-300 dark:hover:border-white/20">
        <div className="flex items-center justify-between mb-5">
           <div className="flex items-center gap-3">
               <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/10">
                 <Target className="w-4 h-4" />
               </div>
               <div>
                 <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{company.name}</h3>
                 <p className="text-[10px] text-neutral-500 font-medium tracking-wide">INTELLIGENCE BRIEF</p>
               </div>
           </div>
           {/* Quick Actions */}
           <div className="flex gap-2">
               {company.phone !== 'N/A' && (
                 <a href={`tel:${company.phone}`} className="p-2 rounded-lg bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors" title="Call">
                    <Phone className="w-4 h-4" />
                 </a>
               )}
               {company.email !== 'N/A' && (
                 <a href={`mailto:${company.email}`} className="p-2 rounded-lg bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition-colors" title="Email">
                    <Mail className="w-4 h-4" />
                 </a>
               )}
           </div>
        </div>

        <div className="space-y-5">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">Mission Parameters</span>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed font-light">
              {company.description}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Hero Product */}
             <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10">
                <div className="flex items-center gap-2 mb-1">
                   <Award className="w-3 h-3 text-amber-500" />
                   <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">Hero Product</span>
                </div>
                <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">{company.heroProduct}</p>
             </div>

             <div className="p-4 rounded-xl bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Recent Intel</span>
                <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 line-clamp-2">"{company.recentWork}"</p>
             </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/5">
             <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">Contact Channels</span>
             <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                   <span className="block text-neutral-400 mb-0.5">Phone</span>
                   <span className="text-neutral-700 dark:text-neutral-300 font-mono">{company.phone}</span>
                </div>
                <div>
                   <span className="block text-neutral-400 mb-0.5">Email</span>
                   <span className="text-neutral-700 dark:text-neutral-300 font-mono truncate">{company.email}</span>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* The Pitcher Card */}
      <section className="flex-1 glass-panel flex flex-col rounded-2xl border border-neutral-200 dark:border-white/10 bg-white/60 dark:bg-neutral-900/60 p-6 shadow-soft min-h-[400px] transition-all hover:border-neutral-300 dark:hover:border-white/20">
         <div className="flex items-center gap-3 mb-5">
           <div className={`
              p-2 rounded-xl ring-1 transition-all duration-500
              ${isGenerating ? 'bg-accent text-white ring-accent shadow-[0_0_15px_rgba(20,184,166,0.4)]' : 'bg-accent-dim text-accent ring-accent/20'}
           `}>
             {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
           </div>
           <div>
             <h3 className="text-sm font-bold text-neutral-900 dark:text-white">The Pitcher</h3>
             <p className="text-[10px] text-neutral-500 font-medium tracking-wide">OUTREACH GENERATOR</p>
           </div>
        </div>

        <div className="space-y-2 mb-6">
          <label className="text-xs font-semibold text-neutral-500 ml-1 uppercase tracking-wide">Your Capabilities</label>
          <div className="relative group">
             <input 
                type="text" 
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="e.g. Documentary editing, 3D product renders..." 
                className="w-full bg-white dark:bg-neutral-950/50 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-4 pr-12 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all shadow-sm"
             />
             <button 
                onClick={handleGenerate}
                disabled={!skills || isGenerating}
                className={`
                    absolute right-2 top-2 p-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm
                    ${isGenerating ? 'bg-accent cursor-wait' : 'bg-accent hover:bg-accent-glow hover:scale-105 active:scale-95'}
                `}
             >
                <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
             </button>
          </div>
        </div>

        <div className="flex-1 relative rounded-xl bg-white dark:bg-neutral-950/80 border border-neutral-200 dark:border-white/10 p-1 font-mono text-sm leading-loose overflow-hidden group shadow-inner">
            {generatedPitch ? (
                <>
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-accent via-indigo-500 to-accent animate-pulse"></div>
                    <textarea 
                        className="w-full h-full bg-transparent resize-none focus:outline-none text-neutral-800 dark:text-neutral-300 p-5 leading-loose"
                        value={generatedPitch}
                        readOnly
                    />
                    <button 
                        onClick={copyToClipboard}
                        className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-accent dark:hover:text-accent hover:bg-white dark:hover:bg-neutral-700 transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 border border-neutral-200 dark:border-white/10 shadow-lg"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-40 select-none">
                    <div className="relative mb-4">
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-700 animate-spin-slow"></div>
                        <Bot className="w-6 h-6 text-neutral-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-xs font-sans font-medium text-neutral-500">Awaiting input parameters...</p>
                </div>
            )}
        </div>
      </section>

    </div>
  );
};