
import React, { useState, useRef, useMemo } from 'react';
import { Ambulance, Incident, AmbulanceStatus, Base, IncidentPriority, Location } from '../types';
import MapView from './MapView';
import { classifyIncident, analyzeEmergencyRoute, getDistance, processVoiceIncident, getPlaceSuggestions } from '../services/geminiService';
import { ICONS, getStatusColor } from '../constants';

interface DispatcherViewProps {
  ambulances: Ambulance[];
  incidents: Incident[];
  bases: Base[];
  onDispatch: (incidentId: string, ambulanceId: string) => void;
  onAddIncident: (data: Partial<Incident>) => void;
}

const DispatcherView: React.FC<DispatcherViewProps> = ({ ambulances, incidents, bases, onDispatch, onAddIncident }) => {
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState('');
  const [address, setAddress] = useState('');
  const [loc, setLoc] = useState<Location>({ lat: -9.9123, lng: -63.0391 });
  const [isBusy, setIsBusy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [routeAnalysis, setRouteAnalysis] = useState<{text: string, links: any[]} | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsBusy(true);
          
          const result = await processVoiceIncident(base64Audio, 'audio/webm');
          if (result) {
            setDesc(result.description || '');
            setAddress(result.address || '');
            
            if (result.address) {
              const suggestions = await getPlaceSuggestions(result.address, loc);
              if (suggestions.length > 0) {
                setLoc({ lat: suggestions[0].lat, lng: suggestions[0].lng });
              }
            }
          }
          setIsBusy(false);
        };
        stream.getTracks().forEach(t => t.stop());
      };
      
      recorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Microfone não autorizado", e);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleCreate = async () => {
    setIsBusy(true);
    const triage = await classifyIncident(desc);
    const analysis = await analyzeEmergencyRoute(loc);
    setRouteAnalysis(analysis);

    onAddIncident({
      description: desc,
      priority: triage.priority,
      occurrenceCode: triage.code,
      location: loc,
      type: 'Clinical'
    });
    
    setDesc('');
    setAddress('');
    setShowForm(false);
    setIsBusy(false);
  };

  const handleDispatch = (incId: string, ambId: string) => {
    setDispatchingId(incId);
    // Simula feedback visual de "Enviando Rota"
    setTimeout(() => {
      onDispatch(incId, ambId);
      setDispatchingId(null);
    }, 800);
  };

  // Categorização para o ticker do rodapé
  const pendingIncidents = useMemo(() => incidents.filter(i => !i.assignedAmbulanceId), [incidents]);
  const activeIncidents = useMemo(() => incidents.filter(i => i.assignedAmbulanceId), [incidents]);

  return (
    <div className="relative h-full w-full bg-black overflow-hidden flex flex-col">
      <MapView ambulances={ambulances} incidents={incidents} bases={bases} center={loc} />

      {/* Header e Formulário */}
      <div className="absolute top-6 inset-x-6 z-[100] flex flex-col items-center gap-4 pointer-events-none">
        <div className="pointer-events-auto">
          {!showForm ? (
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => setShowForm(true)} className="uber-glass px-8 py-4 bg-white text-black flex items-center gap-4 shadow-2xl hover:scale-105 transition-all">
                <ICONS.Alert />
                <p className="text-xs font-bold uppercase tracking-tight">Nova Ocorrência Ariquemes</p>
              </button>
              {routeAnalysis && (
                <div className="uber-glass p-4 max-w-sm border-white/10 animate-reveal">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Análise de Rota Gemini</p>
                  <p className="text-[11px] text-white/80 leading-relaxed mb-3">{routeAnalysis.text}</p>
                  <div className="flex flex-wrap gap-2">
                    {routeAnalysis.links.map((chunk: any, i: number) => (
                      chunk.maps && (
                        <a key={i} href={chunk.maps.uri} target="_blank" rel="noreferrer" className="text-[9px] bg-white/5 border border-white/10 px-2 py-1 rounded text-zinc-400 hover:text-white">
                          Ver no Maps
                        </a>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-lg uber-glass p-6 animate-reveal">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Regulação Médica</h3>
                 <button onClick={() => setShowForm(false)} className="text-white/20 hover:text-white">✕</button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <textarea 
                    className="w-full uber-input h-28 text-sm pt-4 pr-12" 
                    placeholder="Descreva a situação ou use o microfone..."
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                  />
                  <button 
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`absolute right-4 bottom-4 p-3 rounded-full transition-all ${isRecording ? 'bg-red-600 scale-125 animate-pulse text-white' : 'bg-white/5 text-zinc-500'}`}
                  >
                    <ICONS.Microphone />
                  </button>
                </div>

                <input 
                  type="text"
                  className="w-full uber-input text-sm"
                  placeholder="Endereço / Referência"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />

                <button disabled={isBusy || desc.length < 5} onClick={handleCreate} className="w-full uber-btn-primary py-4 text-sm mt-2">
                  {isBusy ? 'Processando Inteligência...' : 'Gerar Despacho Estratégico'}
                </button>
                
                {isRecording && (
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter text-center animate-pulse">Gravando áudio para triagem IA...</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rodapé com Scroll de Situação Atual */}
      <div className="absolute bottom-0 inset-x-0 z-[100] bg-black/80 backdrop-blur-xl border-t border-white/5 pt-4 pb-6 px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Status da Rede de Emergência</h4>
          </div>
          <div className="flex gap-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
            <span>Pendentes: {pendingIncidents.length}</span>
            <span>Ativos: {activeIncidents.length}</span>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {/* Sessão de Pendentes */}
          {pendingIncidents.map(inc => (
            <div key={inc.id} className="min-w-[300px] bg-[#111] border border-white/5 p-4 rounded-xl relative overflow-hidden group">
              {dispatchingId === inc.id && (
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm z-20 flex items-center justify-center animate-reveal">
                  <p className="text-[10px] font-black text-white uppercase italic tracking-widest">Enviando Rota...</p>
                </div>
              )}
              <div className="flex justify-between items-start mb-3">
                <span className="text-[11px] font-black text-red-500 italic uppercase">{inc.occurrenceCode}</span>
                <span className="text-[9px] text-zinc-600 font-mono tracking-tighter">AGUARDANDO VIATURA</span>
              </div>
              <h5 className="text-white text-xs font-bold mb-4 line-clamp-1 italic">{inc.description}</h5>
              
              <div className="grid grid-cols-2 gap-2">
                 {ambulances.filter(a => a.status === AmbulanceStatus.AVAILABLE).slice(0, 2).map(amb => (
                   <button 
                    key={amb.id} 
                    onClick={() => handleDispatch(inc.id, amb.id)} 
                    className="bg-white text-black p-2 rounded-lg flex flex-col items-center hover:bg-zinc-200 transition-all active:scale-95"
                   >
                     <span className="text-[9px] font-black uppercase tracking-tighter">{amb.name}</span>
                     <span className="text-[8px] font-medium opacity-60">Enviar Rota</span>
                   </button>
                 ))}
                 {ambulances.filter(a => a.status === AmbulanceStatus.AVAILABLE).length === 0 && (
                   <div className="col-span-2 text-center py-2 text-[10px] text-zinc-500 italic font-medium uppercase">Nenhuma USA/USB disponível</div>
                 )}
              </div>
            </div>
          ))}

          {/* Sessão de Ativos (Em Curso) */}
          {activeIncidents.map(inc => {
            const assignedAmb = ambulances.find(a => a.id === inc.assignedAmbulanceId);
            return (
              <div key={inc.id} className="min-w-[260px] bg-zinc-900/50 border border-white/10 p-4 rounded-xl">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: assignedAmb ? getStatusColor(assignedAmb.status) : '#555' }}></div>
                    <span className="text-[10px] font-bold text-white uppercase">{assignedAmb?.name || '---'}</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{assignedAmb?.status || 'Finalizado'}</span>
                </div>
                <h5 className="text-white/60 text-[11px] font-medium mb-2 line-clamp-1">{inc.description}</h5>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-1000" 
                    style={{ 
                      width: assignedAmb?.status === AmbulanceStatus.EN_ROUTE ? '33%' : 
                             assignedAmb?.status === AmbulanceStatus.AT_SCENE ? '66%' : 
                             assignedAmb?.status === AmbulanceStatus.TRANSPORTING ? '90%' : '100%' 
                    }}
                  ></div>
                </div>
              </div>
            );
          })}

          {incidents.length === 0 && (
            <div className="w-full py-12 text-center border-2 border-dashed border-white/5 rounded-xl">
              <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.5em]">Nenhuma atividade operacional na rede</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DispatcherView;
