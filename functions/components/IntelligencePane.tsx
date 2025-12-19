import React, { useState } from 'react';
import { Target, Send, Loader2, Sparkles, Copy, Check, Bot, Phone, Mail, Award, Globe, Linkedin, Twitter, Facebook, Instagram, Youtube, Link as LinkIcon, Zap, TrendingUp, DollarSign, Newspaper, Edit3 } from 'lucide-react';
import { Company, Pitch } from '../types';
import { generatePitch } from '../services/geminiService';

interface IntelligencePaneProps {
  company: Company | null;
}

export const IntelligencePane: React.FC<IntelligencePaneProps> = ({ company }) => {
  const [skills, setSkills] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPitches, setGeneratedPitches] = useState<Pitch[]>([]);
  const [activePitchIndex, setActivePitchIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Reset pitches when company changes
  React.useEffect(() => {
    setGeneratedPitches([]);
    setActivePitchIndex(0);
    setIsEditing(false);
  }, [company?.id]);

  const handleGenerate = async () => {
    if (!company || !skills) return;

    setIsGenerating(true);
    setGeneratedPitches([]);
    try {
      const results = await generatePitch({
        companyName: company.name,
        industry: company.industry,
        userSkills: skills,
        tone: 'Professional'
      });
      setGeneratedPitches(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePitchEdit = (newBody: string) => {
    const updated = [...generatedPitches];
    updated[activePitchIndex] = { ...updated[activePitchIndex], body: newBody };
    setGeneratedPitches(updated);
  };

  // Helper to get signal icon
  const getSignalIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('fund') || t.includes('money')) return <DollarSign className="w-3 h-3 text-green-500" />;
    if (t.includes('hir') || t.includes('team')) return <TrendingUp className="w-3 h-3 text-blue-500" />;
    if (t.includes('news') || t.includes('press')) return <Newspaper className="w-3 h-3 text-purple-500" />;
    return <Zap className="w-3 h-3 text-amber-500" />;
  };

  // Helper to parse socials
  const getSocialLinks = () => {
    if (!company || company.socials === 'N/A') return [];
    const links = company.socials.split(/[\s,]+/).filter(s => s.startsWith('http'));
    return links.map((link, index) => {
        let icon = <LinkIcon className="w-4 h-4" />;
        let name = "Website";
        if (link.includes('linkedin')) { icon = <Linkedin className="w-4 h-4" />; name = "LinkedIn"; }
        else if (link.includes('twitter') || link.includes('x.com')) { icon = <Twitter className="w-4 h-4" />; name = "Twitter"; }
        else if (link.includes('facebook')) { icon = <Facebook className="w-4 h-4" />; name = "Facebook"; }
        else if (link.includes('instagram')) { icon = <Instagram className="w-4 h-4" />; name = "Instagram"; }
        else if (link.includes('youtube')) { icon = <Youtube className="w-4 h-4" />; name = "YouTube"; }
        return { url: link, icon, name, key: index };
    });
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

  const socialLinks = getSocialLinks();
  const currentPitch = generatedPitches[activePitchIndex];

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in-up overflow-y-auto pr-1">
      
      {/* 1. Tactical Signals Section */}
      {company.signals && company.signals.length > 0 && (
        <section className="glass-panel rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-900/10 p-4 shadow-sm">
             <div className="flex items-center gap-2 mb-3">
                 <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                 <span className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">Tactical Signals</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                 {company.signals.map((signal, idx) => (
                     <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-neutral-800/50 border border-amber-100 dark:border-white/5">
                         <div className="mt-0.5 shrink-0 p-1 rounded-md bg-neutral-100 dark:bg-white/5">
                             {getSignalIcon(signal.type)}
                         </div>
                         <div>
                             <span className="text-[10px] font-bold text-neutral-500 uppercase block">{signal.type}</span>
                             <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 leading-tight">{signal.text}</p>
                         </div>
                     </div>
                 ))}
             </div>
        </section>
      )}

      {/* 2. The Scout Card */}
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
          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed font-light">
            {company.description}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Hero Product */}
             <div className="p-4 rounded-xl bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/5">
                <div className="flex items-center gap-2 mb-1">
                   <Award className="w-3 h-3 text-accent" />
                   <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Hero Product</span>
                </div>
                <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">{company.heroProduct}</p>
             </div>
             
             {/* Digital Presence */}
             <div className="p-4 rounded-xl bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">Digital Presence</span>
                <div className="flex flex-wrap gap-2">
                    {company.website !== 'N/A' && (
                        <a 
                           href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                           target="_blank" 
                           rel="noreferrer"
                           className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 hover:border-accent dark:hover:border-accent text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-all shadow-sm"
                        >
                           <Globe className="w-3 h-3 text-accent" />
                           Website
                        </a>
                    )}
                    {socialLinks.map(link => (
                        <a key={link.key} href={link.url} target="_blank" rel="noreferrer" className="flex items-center justify-center p-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 hover:border-accent text-neutral-500 hover:text-accent transition-all">
                           {link.icon}
                        </a>
                    ))}
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* 3. The Pitcher Card */}
      <section className="flex-1 glass-panel flex flex-col rounded-2xl border border-neutral-200 dark:border-white/10 bg-white/60 dark:bg-neutral-900/60 p-6 shadow-soft min-h-[500px] transition-all hover:border-neutral-300 dark:hover:border-white/20 relative overflow-hidden">
         <div className="flex items-center gap-3 mb-5">
           <div className={`p-2 rounded-xl ring-1 transition-all duration-500 ${isGenerating ? 'bg-accent text-white ring-accent shadow-[0_0_15px_rgba(20,184,166,0.4)]' : 'bg-accent-dim text-accent ring-accent/20'}`}>
             {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
           </div>
           <div>
             <h3 className="text-sm font-bold text-neutral-900 dark:text-white">The Pitcher</h3>
             <p className="text-[10px] text-neutral-500 font-medium tracking-wide">OUTREACH GENERATOR</p>
           </div>
        </div>

        {/* Input Area */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-semibold text-neutral-500 ml-1 uppercase tracking-wide">Your Capabilities / Offer</label>
          <div className="relative group z-10">
             <input 
                type="text" 
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="e.g. I help Fintechs scale with React & Node.js..." 
                className="w-full bg-white dark:bg-neutral-950/50 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-4 pr-14 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all shadow-sm"
             />
             <button 
                onClick={handleGenerate}
                disabled={!skills || isGenerating}
                className={`absolute right-2 top-2 p-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm ${isGenerating ? 'bg-accent cursor-wait' : 'bg-accent hover:bg-accent-glow hover:scale-105 active:scale-95'}`}
             >
                <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
             </button>
          </div>
        </div>

        {/* Output Area */}
        <div className="flex-1 flex flex-col relative rounded-xl bg-white dark:bg-neutral-950/80 border border-neutral-200 dark:border-white/10 overflow-hidden shadow-inner transition-all">
            {generatedPitches.length > 0 ? (
                <>
                    {/* Tabs */}
                    <div className="flex border-b border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5">
                        {generatedPitches.map((p, idx) => (
                            <button
                                key={idx}
                                onClick={() => { setActivePitchIndex(idx); setIsEditing(false); }}
                                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${idx === activePitchIndex ? 'text-accent border-b-2 border-accent bg-white dark:bg-neutral-900' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                            >
                                {p.angle}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-5 relative overflow-y-auto">
                        <div className="mb-4 pb-4 border-b border-neutral-100 dark:border-white/5">
                            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Subject:</span>
                            <p className="text-sm font-medium text-neutral-800 dark:text-white mt-1 select-all">{currentPitch.subject}</p>
                        </div>
                        
                        {isEditing ? (
                            <textarea 
                                value={currentPitch.body}
                                onChange={(e) => handlePitchEdit(e.target.value)}
                                className="w-full h-[200px] bg-transparent resize-none focus:outline-none text-neutral-600 dark:text-neutral-300 font-mono text-sm leading-loose p-0"
                            />
                        ) : (
                            <p className="text-sm text-neutral-600 dark:text-neutral-300 font-mono leading-loose whitespace-pre-wrap select-all">
                                {currentPitch.body}
                            </p>
                        )}
                    </div>

                    {/* Action Bar */}
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-white/10 flex justify-between items-center">
                         <button 
                            onClick={() => setIsEditing(!isEditing)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isEditing ? 'bg-accent text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10'}`}
                         >
                             <Edit3 className="w-3 h-3" />
                             {isEditing ? 'Done Editing' : 'Edit Pitch'}
                         </button>

                         <div className="flex gap-2">
                             <a 
                                href={`mailto:${company.email}?subject=${encodeURIComponent(currentPitch.subject)}&body=${encodeURIComponent(currentPitch.body)}`}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-white/5 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
                             >
                                 <Mail className="w-3 h-3" />
                                 Draft Email
                             </a>
                             <button 
                                onClick={() => copyToClipboard(`Subject: ${currentPitch.subject}\n\n${currentPitch.body}`)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-accent hover:bg-accent-glow text-white shadow-lg shadow-accent/20 transition-all active:scale-95"
                             >
                                 {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                 {copied ? 'Copied' : 'Copy All'}
                             </button>
                         </div>
                    </div>
                </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-40 select-none p-8 text-center">
                    <div className="relative mb-4">
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-700 animate-spin-slow"></div>
                        <Bot className="w-6 h-6 text-neutral-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-sm font-medium text-neutral-500 mb-1">Awaiting Strategy...</p>
                    <p className="text-xs text-neutral-400">Enter your skills to generate 3 custom outreach angles.</p>
                </div>
            )}
        </div>
      </section>

    </div>
  );
};