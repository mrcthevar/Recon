
import React, { useState } from 'react';
import { Target, Send, Loader2, Sparkles, Copy, Check, Bot, Phone, Mail, Award, Globe, Linkedin, Twitter, Facebook, Instagram, Youtube, Link as LinkIcon, Zap, TrendingUp, DollarSign, Newspaper, Edit3, Bookmark, ShieldCheck, MapPin, Briefcase } from 'lucide-react';
import { Company, Pitch } from '../types';
import { generatePitch } from '../services/geminiService';

interface IntelligencePaneProps {
  company: Company | null;
  onToggleSave: () => void;
  isSaved: boolean;
}

type Tab = 'brief' | 'signals' | 'comms';

export const IntelligencePane: React.FC<IntelligencePaneProps> = ({ company, onToggleSave, isSaved }) => {
  const [activeTab, setActiveTab] = useState<Tab>('brief');
  const [skills, setSkills] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPitches, setGeneratedPitches] = useState<Pitch[]>([]);
  const [activePitchIndex, setActivePitchIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  React.useEffect(() => {
    setGeneratedPitches([]);
    setActivePitchIndex(0);
    setIsEditing(false);
    setActiveTab('brief');
  }, [company?.id]);

  const handleGenerate = async () => {
    if (!company || !skills) return;

    setIsGenerating(true);
    setGeneratedPitches([]);
    try {
      // Pass the found signals to the pitcher for context
      const signalContext = company.signals.map(s => `${s.type}: ${s.text}`);
      
      const results = await generatePitch({
        companyName: company.name,
        industry: company.industry,
        userSkills: skills,
        tone: 'Professional',
        companySignals: signalContext
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

  const getSignalIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('fund') || t.includes('money')) return <DollarSign className="w-3 h-3 text-emerald-500" />;
    if (t.includes('hir') || t.includes('team') || t.includes('growth')) return <TrendingUp className="w-3 h-3 text-blue-500" />;
    if (t.includes('news') || t.includes('press')) return <Newspaper className="w-3 h-3 text-purple-500" />;
    if (t.includes('loc') || t.includes('hq')) return <MapPin className="w-3 h-3 text-orange-500" />;
    return <ShieldCheck className="w-3 h-3 text-accent" />;
  };

  const getSocialLinks = () => {
    if (!company || company.socials === 'N/A') return [];
    const links = company.socials.split(/[\s,]+/).filter(s => s.startsWith('http'));
    return links.map((link, index) => {
        let icon = <LinkIcon className="w-4 h-4" />;
        if (link.includes('linkedin')) icon = <Linkedin className="w-4 h-4" />;
        else if (link.includes('twitter') || link.includes('x.com')) icon = <Twitter className="w-4 h-4" />;
        else if (link.includes('facebook')) icon = <Facebook className="w-4 h-4" />;
        else if (link.includes('instagram')) icon = <Instagram className="w-4 h-4" />;
        else if (link.includes('youtube')) icon = <Youtube className="w-4 h-4" />;
        return { url: link, icon, key: index };
    });
  };

  if (!company) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-400 select-none">
        <div className="w-20 h-20 rounded-3xl bg-neutral-100 dark:bg-neutral-900/50 flex items-center justify-center mb-6 ring-1 ring-neutral-200 dark:ring-white/5">
          <Target className="w-8 h-8 opacity-20" />
        </div>
        <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-2">Target Selection Required</h3>
        <p className="text-sm max-w-xs text-center leading-relaxed opacity-60">Select a lead from the field list or your war room to view intelligence dossier.</p>
      </div>
    );
  }

  const socialLinks = getSocialLinks();
  const currentPitch = generatedPitches[activePitchIndex];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-glass overflow-hidden">
      
      {/* Dossier Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-white/5 bg-neutral-50/50 dark:bg-black/20">
         <div className="flex justify-between items-start mb-4">
             <div>
                 <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">{company.name}</h2>
                 <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                     <Briefcase className="w-3 h-3" />
                     <span>{company.industry}</span>
                     <span className="text-neutral-300 dark:text-neutral-700">•</span>
                     <MapPin className="w-3 h-3" />
                     <span>{company.location || "Unknown Location"}</span>
                 </div>
             </div>
             
             <button 
                onClick={onToggleSave}
                className={`p-2 rounded-lg border transition-all ${isSaved ? 'bg-accent/10 border-accent text-accent' : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-white/10 text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}
                title={isSaved ? "Remove from War Room" : "Save to War Room"}
             >
                 <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-accent' : ''}`} />
             </button>
         </div>

         {/* Stats Bar */}
         <div className="flex items-center gap-4">
             <div className="px-3 py-1.5 rounded-md bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 flex items-center gap-2">
                 <Zap className="w-3 h-3 text-amber-500" />
                 <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Match: {company.hotScore}%</span>
             </div>
             <div className="flex gap-2">
                 {socialLinks.map(link => (
                     <a key={link.key} href={link.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-400 hover:text-accent transition-colors">
                        {link.icon}
                     </a>
                 ))}
                 {company.website !== 'N/A' && (
                     <a href={company.website} target="_blank" rel="noreferrer" className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-400 hover:text-accent transition-colors">
                        <Globe className="w-4 h-4" />
                     </a>
                 )}
             </div>
         </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-white/5">
          <button onClick={() => setActiveTab('brief')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'brief' ? 'border-accent text-accent bg-accent/5' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>Briefing</button>
          <button onClick={() => setActiveTab('signals')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'signals' ? 'border-accent text-accent bg-accent/5' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>Evidence</button>
          <button onClick={() => setActiveTab('comms')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'comms' ? 'border-accent text-accent bg-accent/5' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>Comms</button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50/30 dark:bg-neutral-900/30">
        
        {/* TAB: BRIEFING */}
        {activeTab === 'brief' && (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-white/5">
                    <h3 className="text-xs font-bold text-neutral-500 uppercase mb-3">Company Overview</h3>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                        {company.description}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-2 text-neutral-500">
                            <Award className="w-3 h-3" />
                            <span className="text-xs font-bold uppercase">Hero Product</span>
                        </div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">{company.heroProduct}</p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-white/5">
                         <div className="flex items-center gap-2 mb-2 text-neutral-500">
                            <Target className="w-3 h-3" />
                            <span className="text-xs font-bold uppercase">Identified Needs</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {company.needs.map((need, i) => (
                                <span key={i} className="px-2 py-1 rounded text-[10px] font-bold bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                                    {need}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* TAB: SIGNALS (EVIDENCE) */}
        {activeTab === 'signals' && (
             <div className="space-y-4 animate-fade-in">
                {company.signals.length === 0 ? (
                    <div className="text-center py-10 text-neutral-500">
                        <p className="text-sm">No specific evidence signals detected.</p>
                    </div>
                ) : (
                    company.signals.map((signal, idx) => (
                        <div key={idx} className="flex gap-4 p-4 bg-white dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-white/5 items-start">
                             <div className="mt-1 p-2 rounded-lg bg-neutral-50 dark:bg-white/5">
                                 {getSignalIcon(signal.type)}
                             </div>
                             <div>
                                 <div className="flex items-center gap-2 mb-1">
                                     <span className="text-xs font-bold uppercase text-neutral-900 dark:text-white">{signal.type}</span>
                                     <span className={`text-[9px] px-1.5 py-0.5 rounded ${signal.confidence === 'High' ? 'bg-green-500/10 text-green-500' : 'bg-neutral-500/10 text-neutral-500'}`}>
                                         {signal.confidence} Confidence
                                     </span>
                                 </div>
                                 <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-snug">{signal.text}</p>
                             </div>
                        </div>
                    ))
                )}
                 <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-500 leading-relaxed">
                    <strong className="block mb-1">Scout Assessment:</strong>
                    {company.scoreReasoning || "Automated assessment based on visible digital footprint and relevance."}
                 </div>
             </div>
        )}

        {/* TAB: COMMS (PITCHER) */}
        {activeTab === 'comms' && (
            <div className="h-full flex flex-col animate-fade-in">
                <div className="mb-4">
                    <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Your Offer / Capability</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={skills}
                            onChange={(e) => setSkills(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                            placeholder="e.g. SEO services for e-commerce" 
                            className="flex-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                        <button 
                            onClick={handleGenerate}
                            disabled={!skills || isGenerating}
                            className={`px-4 rounded-lg bg-accent text-white hover:bg-accent-glow disabled:opacity-50 transition-colors shadow-sm`}
                        >
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {generatedPitches.length > 0 ? (
                    <div className="flex-1 flex flex-col bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-white/10 overflow-hidden">
                        <div className="flex border-b border-neutral-200 dark:border-white/5">
                            {generatedPitches.map((p, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => { setActivePitchIndex(idx); setIsEditing(false); }}
                                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${idx === activePitchIndex ? 'text-accent bg-accent/5' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                                >
                                    {p.angle}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto">
                             <div className="mb-3">
                                <span className="text-[10px] font-bold text-neutral-400 uppercase">Subject</span>
                                <p className="text-sm font-medium text-neutral-900 dark:text-white select-all">{currentPitch.subject}</p>
                             </div>
                             <div className="h-px bg-neutral-100 dark:bg-white/5 my-3"></div>
                             {isEditing ? (
                                <textarea 
                                    value={currentPitch.body}
                                    onChange={(e) => {
                                        const newPitches = [...generatedPitches];
                                        newPitches[activePitchIndex].body = e.target.value;
                                        setGeneratedPitches(newPitches);
                                    }}
                                    className="w-full h-40 bg-transparent resize-none focus:outline-none text-sm leading-relaxed p-0"
                                />
                             ) : (
                                <p className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed select-all">
                                    {currentPitch.body}
                                </p>
                             )}
                        </div>
                         <div className="p-2 border-t border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-black/20 flex justify-between items-center">
                             <button onClick={() => setIsEditing(!isEditing)} className="p-2 hover:bg-neutral-200 dark:hover:bg-white/10 rounded text-neutral-500">
                                 <Edit3 className="w-4 h-4" />
                             </button>
                             <div className="flex gap-2">
                                <a href={`mailto:${company.email}?subject=${encodeURIComponent(currentPitch.subject)}&body=${encodeURIComponent(currentPitch.body)}`} className="p-2 rounded hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-600 dark:text-white">
                                    <Mail className="w-4 h-4" />
                                </a>
                                <button onClick={() => copyToClipboard(`Subject: ${currentPitch.subject}\n\n${currentPitch.body}`)} className="p-2 rounded bg-accent text-white shadow-sm hover:bg-accent-glow">
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                             </div>
                        </div>
                    </div>
                ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 opacity-50 border-2 border-dashed border-neutral-200 dark:border-white/5 rounded-xl">
                        <Bot className="w-6 h-6 mb-2" />
                        <span className="text-xs">Enter skills to generate tactical comms</span>
                     </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};
