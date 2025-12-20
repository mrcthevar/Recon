

import React, { useState } from 'react';
import { Target, Send, Loader2, Sparkles, Copy, Check, Bot, Phone, Mail, Award, Globe, Linkedin, Twitter, Facebook, Instagram, Youtube, Link as LinkIcon, Zap, TrendingUp, DollarSign, Newspaper, Edit3, Bookmark, ShieldCheck, MapPin, Briefcase, UserPlus, Search, FileText, UserSearch, Briefcase as BriefcaseIcon, PlusCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { Company, Pitch, Job, SavedJob } from '../types';
import { generatePitch } from '../services/geminiService';

interface IntelligencePaneProps {
  company: Company | null;
  onToggleSave: () => void;
  isSaved: boolean;
  onTrackJob: (job: Job) => void;
  savedJobs: SavedJob[];
}

type Tab = 'overview' | 'insights' | 'jobs' | 'outreach';
type PitchFormat = 'email' | 'linkedin_connect' | 'linkedin_inmail';

export const IntelligencePane: React.FC<IntelligencePaneProps> = ({ 
    company, 
    onToggleSave, 
    isSaved,
    onTrackJob,
    savedJobs 
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [skills, setSkills] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPitches, setGeneratedPitches] = useState<Pitch[]>([]);
  const [activePitchIndex, setActivePitchIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pitchFormat, setPitchFormat] = useState<PitchFormat>('email');
  
  // Outreach Context State
  const [outreachContext, setOutreachContext] = useState<'sales' | 'job_application'>('sales');
  const [targetJobTitle, setTargetJobTitle] = useState('');

  React.useEffect(() => {
    setGeneratedPitches([]);
    setActivePitchIndex(0);
    setIsEditing(false);
    setActiveTab('overview');
    // Default to 'jobs' tab if company has open roles and we are in that mindset? No, Overview is safer.
  }, [company?.id]);

  const handleFormatChange = (format: PitchFormat) => {
    setPitchFormat(format);
    setGeneratedPitches([]);
    setActivePitchIndex(0);
    setIsEditing(false);
  };

  const handleGenerate = async () => {
    if (!company || !skills) return;

    setIsGenerating(true);
    setGeneratedPitches([]);
    setActivePitchIndex(0);
    
    try {
      const signalContext = company.signals.map(s => `${s.type}: ${s.text}`);
      
      const results = await generatePitch({
        companyName: company.name,
        industry: company.industry,
        userSkills: skills,
        tone: 'Professional',
        companySignals: signalContext,
        format: pitchFormat,
        context: outreachContext,
        jobTitle: targetJobTitle
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
    if (!company || !company.socials || company.socials === 'N/A' || company.socials === 'None') return [];
    
    return company.socials
      .split(/[\s,\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.toLowerCase().includes('n/a'))
      .map((rawLink, index) => {
        let url = rawLink.replace(/[\[\]()]/g, '');
        if (!url.startsWith('http')) url = `https://${url}`;
        if (!url.includes('.') || url.length < 8) return null;

        let icon = <LinkIcon className="w-4 h-4" />;
        const lowerUrl = url.toLowerCase();
        
        if (lowerUrl.includes('linkedin')) icon = <Linkedin className="w-4 h-4" />;
        else if (lowerUrl.includes('twitter') || lowerUrl.includes('x.com')) icon = <Twitter className="w-4 h-4" />;
        else if (lowerUrl.includes('facebook')) icon = <Facebook className="w-4 h-4" />;
        else if (lowerUrl.includes('instagram')) icon = <Instagram className="w-4 h-4" />;
        else if (lowerUrl.includes('youtube')) icon = <Youtube className="w-4 h-4" />;
        
        return { url, icon, key: index };
      })
      .filter((link): link is { url: string; icon: React.ReactElement; key: number } => link !== null);
  };

  if (!company) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-400 select-none bg-neutral-50/50 dark:bg-black/20">
         <div className="max-w-md p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-accent/10 rounded-xl">
                    <Target className="w-8 h-8 text-accent" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Welcome to Recon</h2>
                    <p className="text-sm text-neutral-500">Intelligence Suite for Lead Generation</p>
                </div>
            </div>
            
            <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-white dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-white/5 shadow-sm">
                    <div className="mt-1 p-1.5 bg-blue-500/10 rounded-lg">
                        <Search className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white">1. Discover</h4>
                        <p className="text-xs text-neutral-500 mt-1">Search by Industry, City or Role (e.g., "Copywriter in Mumbai") to find leads.</p>
                    </div>
                </div>
                
                 <div className="flex items-start gap-4 p-4 bg-white dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-white/5 shadow-sm">
                    <div className="mt-1 p-1.5 bg-purple-500/10 rounded-lg">
                        <FileText className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white">2. Analyze & Track Jobs</h4>
                        <p className="text-xs text-neutral-500 mt-1">View open roles, verified contact info, and track your application pipeline.</p>
                    </div>
                </div>

                 <div className="flex items-start gap-4 p-4 bg-white dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-white/5 shadow-sm">
                    <div className="mt-1 p-1.5 bg-green-500/10 rounded-lg">
                        <Send className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white">3. Outreach</h4>
                        <p className="text-xs text-neutral-500 mt-1">Generate AI-personalized emails or job applications tailored to the company.</p>
                    </div>
                </div>
            </div>
         </div>
      </div>
    );
  }

  const socialLinks = getSocialLinks();
  const currentPitch = generatedPitches[activePitchIndex];

  // Helper to check if a job is tracked
  const isJobTracked = (jobId: string) => savedJobs.some(j => j.id === jobId);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-glass overflow-hidden">
      
      {/* Header */}
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
                aria-label={isSaved ? "Remove Company" : "Save Company"}
                className={`p-2 rounded-lg border transition-all ${isSaved ? 'bg-accent/10 border-accent text-accent' : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-white/10 text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}
                title={isSaved ? "Remove Company" : "Save Company"}
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
                     <a 
                        key={link.key} 
                        href={link.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        aria-label={`Visit ${link.url}`}
                        className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-400 hover:text-accent transition-colors"
                     >
                        {link.icon}
                     </a>
                 ))}
                 {company.website !== 'N/A' && (
                     <a 
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        aria-label="Visit Website"
                        className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-400 hover:text-accent transition-colors"
                     >
                        <Globe className="w-4 h-4" />
                     </a>
                 )}
             </div>
         </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-white/5" role="tablist">
          {['overview', 'insights', 'jobs', 'outreach'].map((tab) => (
             <button 
                key={tab}
                onClick={() => setActiveTab(tab as Tab)} 
                role="tab"
                aria-selected={activeTab === tab}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 
                    ${activeTab === tab 
                        ? 'border-accent text-accent bg-accent/5' 
                        : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
             >
                {tab}
             </button>
          ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50/30 dark:bg-neutral-900/30">
        
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
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
                
                {company.hiringCulture && (
                    <div className="bg-white dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-2 text-neutral-500">
                            <UserSearch className="w-3 h-3" />
                            <span className="text-xs font-bold uppercase">Hiring Culture</span>
                        </div>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            {company.hiringCulture}
                        </p>
                    </div>
                )}
            </div>
        )}

        {/* TAB: INSIGHTS (EVIDENCE) */}
        {activeTab === 'insights' && (
             <div className="space-y-4 animate-fade-in">
                {company.signals.length === 0 ? (
                    <div className="text-center py-10 text-neutral-500">
                        <p className="text-sm">No specific insights detected.</p>
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
                    <strong className="block mb-1">AI Analysis:</strong>
                    {company.scoreReasoning || "Automated assessment based on visible digital footprint and relevance."}
                 </div>
             </div>
        )}

        {/* TAB: JOBS */}
        {activeTab === 'jobs' && (
            <div className="space-y-4 animate-fade-in">
                {(!company.openRoles || company.openRoles.length === 0) ? (
                    <div className="text-center py-12 text-neutral-500 flex flex-col items-center">
                        <BriefcaseIcon className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-sm font-medium">No open roles detected.</p>
                        <p className="text-xs opacity-70 mt-1">Try checking their Careers page directly.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {company.openRoles.map((role, idx) => {
                           const tracked = isJobTracked(role.id);
                           return (
                            <div key={idx} className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-white/5 hover:border-accent/30 transition-all shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-neutral-900 dark:text-white text-sm">{role.title}</h4>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 mt-1.5">
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {role.location}</span>
                                            {role.type && <span className="bg-neutral-100 dark:bg-white/5 px-1.5 py-0.5 rounded">{role.type}</span>}
                                            {role.salary && <span className="text-emerald-600 dark:text-emerald-400 font-medium">{role.salary}</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                setOutreachContext('job_application');
                                                setTargetJobTitle(role.title);
                                                setActiveTab('outreach');
                                            }}
                                            aria-label="Draft Application"
                                            className="p-2 text-neutral-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                                            title="Draft Application"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => onTrackJob(role)}
                                            aria-label={tracked ? "Job Tracked" : "Track Role"}
                                            className={`p-2 rounded-lg transition-colors border ${tracked ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-transparent border-neutral-200 dark:border-white/10 text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}
                                            title={tracked ? "Tracked" : "Track Role"}
                                        >
                                            {tracked ? <CheckCircle className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                {role.link && (
                                     <a href={role.link} target="_blank" rel="noreferrer" className="mt-3 text-xs text-accent hover:underline inline-flex items-center gap-1">
                                         View Full Listing <ExternalLink className="w-3 h-3" />
                                     </a>
                                )}
                            </div>
                           );
                        })}
                    </div>
                )}
            </div>
        )}

        {/* TAB: OUTREACH (COMMS) */}
        {activeTab === 'outreach' && (
            <div className="h-full flex flex-col animate-fade-in">
                
                {/* Context Switcher */}
                <div className="flex items-center justify-between mb-4">
                     <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-white/5">
                        <button
                            onClick={() => { setOutreachContext('sales'); setTargetJobTitle(''); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${outreachContext === 'sales' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
                        >
                            Sales Pitch
                        </button>
                        <button
                            onClick={() => { setOutreachContext('job_application'); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${outreachContext === 'job_application' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
                        >
                            Job Application
                        </button>
                     </div>
                     {outreachContext === 'job_application' && (
                         <input 
                            type="text" 
                            value={targetJobTitle}
                            onChange={(e) => setTargetJobTitle(e.target.value)}
                            placeholder="Target Role..."
                            aria-label="Target Role"
                            className="bg-transparent border-b border-neutral-200 dark:border-white/10 px-2 py-1 text-xs text-right focus:outline-none focus:border-accent w-32"
                         />
                     )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <button 
                        onClick={() => handleFormatChange('email')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 border border-transparent ${pitchFormat === 'email' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white border-neutral-200 dark:border-white/5' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                    >
                        <Mail className="w-3.5 h-3.5" />
                        Email
                    </button>
                    <button 
                        onClick={() => handleFormatChange('linkedin_inmail')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 border border-transparent ${pitchFormat === 'linkedin_inmail' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white border-neutral-200 dark:border-white/5' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                    >
                        <Linkedin className="w-3.5 h-3.5" />
                        InMail
                    </button>
                    <button 
                        onClick={() => handleFormatChange('linkedin_connect')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 border border-transparent ${pitchFormat === 'linkedin_connect' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white border-neutral-200 dark:border-white/5' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        Connect
                    </button>
                </div>

                <div className="mb-4">
                    <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">Your Offer / Skills</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={skills}
                            onChange={(e) => setSkills(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                            aria-label="Your Skills"
                            placeholder={outreachContext === 'job_application' ? "e.g. 5 yrs Exp in React, UI Design" : "e.g. SEO services for e-commerce"} 
                            className="flex-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                        <button 
                            onClick={handleGenerate}
                            disabled={!skills || isGenerating}
                            aria-label="Generate Pitch"
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
                             {pitchFormat !== 'linkedin_connect' && (
                                <div className="mb-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase">Subject</span>
                                    </div>
                                    {isEditing ? (
                                        <input 
                                            type="text"
                                            value={currentPitch.subject}
                                            onChange={(e) => {
                                                const newPitches = [...generatedPitches];
                                                newPitches[activePitchIndex].subject = e.target.value;
                                                setGeneratedPitches(newPitches);
                                            }}
                                            className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-white/10 rounded px-2 py-1.5 text-sm font-medium text-neutral-900 dark:text-white focus:outline-none focus:border-accent"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium text-neutral-900 dark:text-white select-all">{currentPitch.subject}</p>
                                    )}
                                    <div className="h-px bg-neutral-100 dark:bg-white/5 my-3"></div>
                                </div>
                             )}
                             
                             {isEditing ? (
                                <textarea 
                                    value={currentPitch.body}
                                    onChange={(e) => {
                                        const newPitches = [...generatedPitches];
                                        newPitches[activePitchIndex].body = e.target.value;
                                        setGeneratedPitches(newPitches);
                                    }}
                                    className="w-full h-40 bg-transparent resize-none focus:outline-none text-sm leading-relaxed p-0 text-neutral-600 dark:text-neutral-300"
                                />
                             ) : (
                                <p className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed select-all">
                                    {currentPitch.body}
                                </p>
                             )}
                        </div>
                         <div className="p-2 border-t border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-black/20 flex justify-between items-center">
                             <div className="flex gap-2 items-center">
                                <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded transition-colors ${isEditing ? 'bg-accent/10 text-accent' : 'hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-500'}`} title={isEditing ? "Finish Editing" : "Edit Text"} aria-label={isEditing ? "Finish Editing" : "Edit Text"}>
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                {pitchFormat === 'linkedin_connect' && (
                                    <span className={`text-[10px] font-mono ${currentPitch.body.length > 300 ? 'text-red-500 font-bold' : 'text-neutral-400'}`}>
                                        {currentPitch.body.length}/300
                                    </span>
                                )}
                             </div>
                             <div className="flex gap-2">
                                {pitchFormat === 'email' && (
                                    <a href={`mailto:${company.email}?subject=${encodeURIComponent(currentPitch.subject)}&body=${encodeURIComponent(currentPitch.body)}`} className="p-2 rounded hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-600 dark:text-white" title="Open Mail Client" aria-label="Open Mail Client">
                                        <Mail className="w-4 h-4" />
                                    </a>
                                )}
                                <button onClick={() => copyToClipboard((pitchFormat === 'email' || pitchFormat === 'linkedin_inmail') ? `Subject: ${currentPitch.subject}\n\n${currentPitch.body}` : currentPitch.body)} className="flex items-center gap-2 px-3 py-1.5 rounded bg-accent text-white shadow-sm hover:bg-accent-glow text-xs font-bold uppercase transition-colors" aria-label="Copy to Clipboard">
                                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    <span>{copied ? 'Copied' : 'Copy'}</span>
                                </button>
                             </div>
                        </div>
                    </div>
                ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 opacity-50 border-2 border-dashed border-neutral-200 dark:border-white/5 rounded-xl">
                        <Bot className="w-6 h-6 mb-2" />
                        <span className="text-xs">Enter skills to generate messages</span>
                     </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};