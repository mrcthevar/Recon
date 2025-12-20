

import React, { useEffect, useRef, useState } from 'react';
import { Mic, X, Activity, Volume2, Globe, Wifi } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Company } from '../types';

interface VoiceModeProps {
  isActive: boolean;
  onClose: () => void;
  contextCompany: Company | null;
}

export const VoiceMode: React.FC<VoiceModeProps> = ({ isActive, onClose, contextCompany }) => {
  const [status, setStatus] = useState<'connecting' | 'listening' | 'speaking' | 'error'>('connecting');
  const [volumeLevel, setVolumeLevel] = useState(0);
  
  // Refs for Audio Handling
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentCompanyIdRef = useRef<string | null>(null);
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  // Initialize Audio Contexts
  // We use 16kHz for input (Gemini requirement) and 24kHz for output (Gemini high-quality voice)
  const ensureAudioContexts = () => {
    if (!inputContextRef.current) {
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    }
    if (!outputContextRef.current) {
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    // Resume if suspended (browser autoplay policy)
    if (inputContextRef.current.state === 'suspended') inputContextRef.current.resume();
    if (outputContextRef.current.state === 'suspended') outputContextRef.current.resume();
  };

  const stopAllAudio = () => {
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
      try { source.disconnect(); } catch (e) { /* ignore */ }
    });
    audioSourcesRef.current = [];
    if (outputContextRef.current) {
        nextStartTimeRef.current = outputContextRef.current.currentTime;
    }
  };

  // Helper: Base64 to ArrayBuffer
  const decodeAudioData = async (base64: string, ctx: AudioContext): Promise<AudioBuffer> => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Convert PCM to AudioBuffer
    const dataInt16 = new Int16Array(bytes.buffer);
    const frameCount = dataInt16.length; 
    const buffer = ctx.createBuffer(1, frameCount, 24000); // 24kHz output from Gemini
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  // Helper: Float32 to PCM Base64 (16-bit)
  const createPcmData = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = Math.max(-1, Math.min(1, data[i])) * 32768;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  useEffect(() => {
    let mounted = true;

    const startSession = async () => {
      if (!isActive) return;

      try {
        setStatus('connecting');
        ensureAudioContexts();

        const apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY; 
        if (!apiKey) throw new Error("No API Key");

        const ai = new GoogleGenAI({ apiKey });

        const config = {
          responseModalities: [Modality.AUDIO],
          tools: [{ googleSearch: {} }], // Enable Search for real-time intelligence
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `You are Recon's Voice Assistant. Keep responses concise, punchy, and professional. 
          You help users find leads, analyze companies, AND find jobs/roles.
          
          If the user asks to "find jobs" or "find roles", use Google Search to find current openings.
          If the user is looking at a specific company, focus on that context.
          
          Do not be verbose. Be helpful and direct.`,
        };

        sessionPromiseRef.current = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          config,
          callbacks: {
            onopen: async () => {
              if (!mounted) return;
              console.log("Recon Live: Connected");
              setStatus('listening');

              // Start Microphone with Echo Cancellation
              mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
                  audio: {
                      echoCancellation: true,
                      noiseSuppression: true,
                      autoGainControl: true,
                      sampleRate: 16000 
                  }
              });
              
              if (!inputContextRef.current) return;
              
              const inputCtx = inputContextRef.current;
              sourceNodeRef.current = inputCtx.createMediaStreamSource(mediaStreamRef.current);
              // Reduced buffer size to 2048 for lower latency (approx 128ms)
              processorRef.current = inputCtx.createScriptProcessor(2048, 1, 1);
              
              processorRef.current.onaudioprocess = (e) => {
                if (!mounted) return;
                const inputData = e.inputBuffer.getChannelData(0);
                
                // Visualization
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                const rms = Math.sqrt(sum / inputData.length);
                setVolumeLevel(Math.min(1, rms * 5)); 

                // Send to Gemini
                const pcmBase64 = createPcmData(inputData);
                sessionPromiseRef.current?.then(session => {
                  session.sendRealtimeInput({
                    media: {
                      mimeType: 'audio/pcm;rate=16000', // Explicitly 16kHz
                      data: pcmBase64
                    }
                  });
                });
              };

              sourceNodeRef.current.connect(processorRef.current);
              processorRef.current.connect(inputCtx.destination);
              
              if (contextCompany) {
                 const initialContext = `User is analyzing: ${contextCompany.name} (${contextCompany.industry}). 
                 Description: ${contextCompany.description.substring(0, 200)}...
                 Key Needs: ${contextCompany.needs.join(', ')}.
                 Open Roles: ${contextCompany.openRoles ? contextCompany.openRoles.map(r => r.title).join(', ') : 'None detected'}`;
                 
                 sessionPromiseRef.current?.then(session => {
                     session.sendRealtimeInput({ text: initialContext });
                 });
              }
            },
            onmessage: async (msg: LiveServerMessage) => {
              if (!mounted) return;

              // Handle Interruption
              if (msg.serverContent?.interrupted) {
                  console.log("Recon Live: Interrupted");
                  stopAllAudio();
                  setStatus('listening');
                  return;
              }
              
              // Handle Audio Output
              const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audioData && outputContextRef.current) {
                setStatus('speaking');
                const buffer = await decodeAudioData(audioData, outputContextRef.current);
                
                const src = outputContextRef.current.createBufferSource();
                src.buffer = buffer;
                src.connect(outputContextRef.current.destination);
                
                // Track source for cancellation
                audioSourcesRef.current.push(src);
                src.onended = () => {
                    audioSourcesRef.current = audioSourcesRef.current.filter(s => s !== src);
                    if (audioSourcesRef.current.length === 0 && mounted) {
                        setStatus('listening');
                    }
                };
                
                const currentTime = outputContextRef.current.currentTime;
                const startTime = Math.max(currentTime, nextStartTimeRef.current);
                src.start(startTime);
                nextStartTimeRef.current = startTime + buffer.duration;
              }
            },
            onclose: () => {
              console.log("Recon Live: Closed");
              if (mounted) onClose();
            },
            onerror: (err) => {
              console.error("Recon Live Error:", err);
              if (mounted) setStatus('error');
            }
          }
        });

      } catch (err) {
        console.error("Setup Error", err);
        setStatus('error');
      }
    };

    if (isActive) {
      startSession();
    }

    return () => {
      mounted = false;
      stopAllAudio();
      
      // Cleanup Input
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (processorRef.current && sourceNodeRef.current) {
        processorRef.current.disconnect();
        sourceNodeRef.current.disconnect();
      }
      if (inputContextRef.current) {
        inputContextRef.current.close();
        inputContextRef.current = null;
      }
      // Cleanup Output
      if (outputContextRef.current) {
        outputContextRef.current.close();
        outputContextRef.current = null;
      }
      sessionPromiseRef.current = null;
    };
  }, [isActive]);

  // Handle Context Updates
  useEffect(() => {
    if (isActive && contextCompany && contextCompany.id !== currentCompanyIdRef.current && sessionPromiseRef.current) {
        currentCompanyIdRef.current = contextCompany.id;
        const updateMsg = `Context Update: User switched to ${contextCompany.name}. Focus on this company now.`;
        sessionPromiseRef.current.then(session => {
            session.sendRealtimeInput({ text: updateMsg });
        });
    }
  }, [contextCompany, isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm mx-auto p-6">
        
        {/* Main Card */}
        <div className="relative bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center py-10 transition-all duration-300">
            
            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition-colors hover:rotate-90 duration-300"
            >
                <X className="w-5 h-5" />
            </button>

            {/* Connection Status Indicator */}
            <div className="absolute top-5 left-6 flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${status === 'error' ? 'bg-red-500' : (status === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500')}`}></div>
                 <span className="text-[10px] font-mono text-neutral-500 uppercase">
                    {status === 'connecting' ? 'SYNCING' : 'LIVE'}
                 </span>
            </div>

            {/* Visualizer Orb */}
            <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
                {/* Background Rotating Ring 1 */}
                <div 
                    className="absolute inset-0 rounded-full border-2 border-accent/20 border-t-accent/60 animate-[spin_3s_linear_infinite]"
                    style={{ transform: `scale(${1 + volumeLevel * 0.5})` }}
                ></div>

                {/* Background Rotating Ring 2 (Counter-rotate) */}
                <div 
                    className="absolute inset-4 rounded-full border-2 border-purple-500/20 border-b-purple-500/60 animate-[spin_4s_linear_infinite_reverse]"
                    style={{ transform: `scale(${1 + volumeLevel * 0.3})` }}
                ></div>

                {/* Core Glow */}
                <div 
                    className={`absolute inset-0 rounded-full bg-accent/20 blur-2xl transition-all duration-100 ease-linear`}
                    style={{ transform: `scale(${1 + volumeLevel * 1.5})`, opacity: volumeLevel + 0.5 }}
                ></div>
                
                {/* Center Core */}
                <div 
                    className={`relative w-24 h-24 rounded-full flex items-center justify-center border transition-all duration-300 shadow-lg z-10
                    ${status === 'error' ? 'border-red-500 bg-red-900/50 shadow-red-500/50' : 
                      status === 'speaking' ? 'border-accent bg-accent text-white shadow-accent/50 scale-110' : 
                      'border-neutral-700 bg-neutral-800 text-neutral-400'}`}
                >
                    {status === 'connecting' && <Activity className="w-8 h-8 animate-pulse" />}
                    {status === 'listening' && <div className={`w-3 h-3 rounded-full bg-red-500 animate-pulse transition-all ${volumeLevel > 0.1 ? 'scale-150' : ''}`} />}
                    {status === 'speaking' && <Volume2 className="w-8 h-8 animate-bounce" />}
                    {status === 'error' && <X className="w-8 h-8" />}
                </div>
            </div>

            {/* Status Text */}
            <h3 className="text-xl font-bold text-white mb-2 tracking-wide uppercase">
                {status === 'connecting' && "Connecting..."}
                {status === 'listening' && "Listening"}
                {status === 'speaking' && "Recon AI"}
                {status === 'error' && "Connection Error"}
            </h3>
            
            <p className="text-xs font-mono text-neutral-500 text-center max-w-[240px] leading-relaxed">
                {status === 'error' ? "Microphone access denied or connection dropped." : 
                 contextCompany ? `Analyzing ${contextCompany.name}. Ask for open roles or contact info.` : "I'm listening. Ask me to find jobs, leads, or analyze companies."}
            </p>

            {/* Dynamic Waveform */}
            {status !== 'error' && (
                <div className="flex gap-1.5 mt-8 h-12 items-center justify-center">
                   {[...Array(7)].map((_, i) => (
                       <div 
                         key={i} 
                         className={`w-1.5 rounded-full transition-all duration-150 ease-in-out ${status === 'speaking' ? 'bg-accent' : 'bg-neutral-700'}`}
                         style={{ 
                             height: status === 'speaking' || (status === 'listening' && volumeLevel > 0.05) 
                               ? `${Math.random() * 40 + 10}px` 
                               : '4px',
                             opacity: status === 'speaking' ? 0.8 : 0.5
                         }}
                       ></div>
                   ))}
                </div>
            )}
            
            {/* Tool Indicators (Static for now, but implies capability) */}
            <div className="absolute bottom-4 flex gap-3 text-neutral-600">
               <Globe className="w-4 h-4 opacity-50" />
               <Wifi className="w-4 h-4 opacity-50" />
            </div>
        </div>
      </div>
    </div>
  );
};