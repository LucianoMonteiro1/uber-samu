
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { encode, decode, decodeAudioData, logOperationalEventFunctionDeclaration } from '../services/geminiService';
import { ICONS } from '../constants';

interface VoiceAssistantUIProps {
  onStatusUpdate: (status: string) => void;
  onOperationalLog: (type: string, data?: string) => void;
  contextMessage?: string; 
  driverName?: string;
  isCarMode?: boolean;
}

const VoiceAssistantUI: React.FC<VoiceAssistantUIProps> = ({ onStatusUpdate, onOperationalLog, contextMessage, driverName = "Condutor", isCarMode }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [aiSpeech, setAiSpeech] = useState('');
  
  const sessionRef = useRef<any>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (contextMessage && !isActive) {
      toggleAssistant(contextMessage);
    }
  }, [contextMessage]);

  const cleanup = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    
    outputAudioContextRef.current?.close();
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current = null;
    inputAudioContextRef.current = null;
    
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    
    nextStartTimeRef.current = 0;
    setIsActive(false);
  };

  const toggleAssistant = async (initialPrompt?: string) => {
    if (isActive && !initialPrompt) {
      cleanup();
      return;
    }

    try {
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            if (!inputAudioContextRef.current) return;
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              // BUG FIX: Garantia de envio apenas se a sessão estiver ativa
              if (!sessionRef.current) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              
              sessionRef.current.sendRealtimeInput({
                media: {
                  data: encode(new Uint8Array(int16.buffer)),
                  mimeType: 'audio/pcm;rate=16000',
                }
              });
            };

            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              setAiSpeech(prev => prev + message.serverContent!.outputTranscription!.text);
            } else if (message.serverContent?.inputTranscription) {
              setTranscription(prev => prev + message.serverContent!.inputTranscription!.text);
            }

            const audioBase64 = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioBase64 && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const buffer = await decodeAudioData(decode(audioBase64), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.add(source);
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'logOperationalEvent') {
                  onOperationalLog(fc.args.eventType as string, fc.args.data as string);
                  if (sessionRef.current) {
                    sessionRef.current.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "OK" },
                      }
                    });
                  }
                }
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => cleanup(),
          onerror: () => cleanup()
        },
        config: {
          systemInstruction: `Você é o copiloto do SAMU. Condutor: ${driverName}. Ajude com logística e protocolos.`,
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [logOperationalEventFunctionDeclaration] }],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          }
        }
      });

      // BUG FIX: Armazenar a instância resolvida no ref
      sessionRef.current = await sessionPromise;
      setIsActive(true);
    } catch (err) {
      cleanup();
    }
  };

  return (
    <div className={`fixed flex flex-col items-end gap-3 z-50 bottom-6 right-6`}>
      {isActive && (aiSpeech || transcription) && (
        <div className={`p-4 rounded-3xl max-w-sm bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 animate-fade-in mb-2`}>
          <p className="text-sm text-white font-bold italic leading-tight">
            {transcription || aiSpeech}
          </p>
        </div>
      )}

      <button
        onClick={() => toggleAssistant()}
        className={`p-6 border-4 rounded-full shadow-2xl transition-all active:scale-90 ${
          isActive 
            ? 'bg-blue-600 border-blue-400 text-white animate-pulse' 
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <ICONS.Microphone />
      </button>
    </div>
  );
};

export default VoiceAssistantUI;
