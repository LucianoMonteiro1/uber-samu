
import React, { useState, useEffect, useRef } from 'react';
import { Ambulance, Incident, AmbulanceStatus, Location, Base } from '../types';
import MapView from './MapView';
import VoiceAssistantUI from './VoiceAssistantUI';
import { ICONS } from '../constants';
import { getDistance, generateVoiceAlert, decodeAudioData } from '../services/geminiService';

interface AmbulanceViewProps {
  ambulance: Ambulance;
  assignedIncident?: Incident;
  bases?: Base[];
  onStatusUpdate: (id: string, newStatus: AmbulanceStatus) => void;
  driverName: string;
  plate: string;
  initialKm: string;
}

const AmbulanceView: React.FC<AmbulanceViewProps> = ({ ambulance, assignedIncident, bases = [], onStatusUpdate, driverName, plate, initialKm }) => {
  const [currentLocation, setCurrentLocation] = useState<Location>(ambulance.location);
  const [totalKmTravelled, setTotalKmTravelled] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  
  const lastLocationRef = useRef<Location>(ambulance.location);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sirenRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (assignedIncident && ambulance.status === AmbulanceStatus.DISPATCHED && !hasAcknowledged) {
      
      const playAlerta = async () => {
        if (!sirenRef.current) {
          sirenRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
          sirenRef.current.loop = true;
          sirenRef.current.volume = 0.4;
        }
        sirenRef.current.play().catch(() => {});

        const voiceText = `Atenção ${ambulance.name}. Nova ocorrência: ${assignedIncident.description}. Prioridade ${assignedIncident.priority}.`;
        const audioBytes = await generateVoiceAlert(voiceText);

        if (audioBytes) {
          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          }
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') await ctx.resume();
          
          const buffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          
          if (sirenRef.current) sirenRef.current.volume = 0.1;
          source.onended = () => { if (sirenRef.current) sirenRef.current.volume = 0.6; };
          source.start(0);
        }
      };

      playAlerta();
      window.navigator.vibrate?.([500, 200, 500]);

      return () => {
        sirenRef.current?.pause();
      };
    }
  }, [assignedIncident, ambulance.status, hasAcknowledged]);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading || 0 };
        setCurrentLocation(newLoc);
        const dist = getDistance(lastLocationRef.current, newLoc);
        if (dist > 0.002) {
          setTotalKmTravelled(prev => prev + dist);
          lastLocationRef.current = newLoc;
        }
        // Auto-detectar chegada no local (80 metros)
        if (assignedIncident && ambulance.status === AmbulanceStatus.EN_ROUTE) {
          if (getDistance(newLoc, assignedIncident.location) < 0.08) {
            onStatusUpdate(ambulance.id, AmbulanceStatus.AT_SCENE);
          }
        }
      },
      undefined, { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [assignedIncident, ambulance.status]);

  const handleAccept = () => {
    setHasAcknowledged(true);
    sirenRef.current?.pause();
    onStatusUpdate(ambulance.id, AmbulanceStatus.EN_ROUTE);
  };

  return (
    <div className="relative h-full w-full bg-black flex flex-col overflow-hidden">
      <MapView 
        ambulances={[{...ambulance, location: currentLocation}]} 
        incidents={assignedIncident ? [assignedIncident] : []} 
        bases={bases}
        center={currentLocation}
        isViatura
      />

      {assignedIncident && ambulance.status === AmbulanceStatus.DISPATCHED && !hasAcknowledged && (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-between p-10 bg-black/90 backdrop-blur-3xl animate-reveal">
          <div className="z-10 text-center pt-16">
            <div className="w-24 h-24 bg-[#FF1744] rounded-full flex items-center justify-center mx-auto mb-6 pulse-ring shadow-[0_0_60px_#FF1744]">
               <span className="text-5xl">🚑</span>
            </div>
            <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none">Despacho<br/>Imediato</h1>
          </div>

          <div className="z-10 w-full max-w-sm">
            <div className="uber-glass p-8 border-white/10 mb-8 text-center bg-white/5">
               <h2 className="text-3xl font-black text-white leading-tight mb-2 uppercase italic">{assignedIncident.description}</h2>
               <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{assignedIncident.priority}</p>
            </div>

            <button onClick={handleAccept} className="w-full bg-white text-black py-8 rounded-[2.5rem] font-black text-2xl uppercase italic">
              Ciente / Em Deslocamento
            </button>
          </div>
        </div>
      )}

      {assignedIncident && hasAcknowledged && (
        <div className="absolute top-4 inset-x-4 z-[100] animate-reveal">
          <div className={`uber-glass p-6 border-l-[12px] ${assignedIncident.priority === 'Vermelho' ? 'border-red-600' : 'border-yellow-500'}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{assignedIncident.occurrenceCode}</p>
                <h2 className="text-xl font-black text-white leading-tight uppercase italic">{assignedIncident.description}</h2>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white tracking-tighter">{getDistance(currentLocation, assignedIncident.location).toFixed(1)} km</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 inset-x-6 z-[100]">
        <div className="uber-glass p-6 bg-black/80">
          {!assignedIncident ? (
            <div className="text-center py-6">
              <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">Em QAP</h3>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mt-2">{driverName} • {plate}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {ambulance.status === AmbulanceStatus.EN_ROUTE && (
                <button onClick={() => onStatusUpdate(ambulance.id, AmbulanceStatus.AT_SCENE)} className="uber-btn-primary py-6 text-xl italic">Cheguei no Local</button>
              )}
              {ambulance.status === AmbulanceStatus.AT_SCENE && (
                <button onClick={() => onStatusUpdate(ambulance.id, AmbulanceStatus.TRANSPORTING)} className="bg-orange-500 text-white font-black py-6 rounded-2xl uppercase text-lg italic">Iniciar Transporte</button>
              )}
              {ambulance.status === AmbulanceStatus.TRANSPORTING && (
                <button onClick={() => onStatusUpdate(ambulance.id, AmbulanceStatus.AT_HOSPITAL)} className="bg-blue-600 text-white font-black py-6 rounded-2xl uppercase text-lg italic">Chegada Hospital</button>
              )}
              {ambulance.status === AmbulanceStatus.AT_HOSPITAL && (
                <button onClick={() => setShowSummary(true)} className="bg-[#FF1744] text-white font-black py-6 rounded-2xl uppercase text-lg italic">Liberar Viatura (QAP)</button>
              )}
            </div>
          )}
        </div>
      </div>

      {showSummary && (
        <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8 animate-reveal">
          <div className="w-full max-w-sm uber-glass p-10 border-white/10 text-center">
            <h2 className="text-3xl font-black text-white italic tracking-tighter mb-2">Missão Finalizada</h2>
            <p className="text-5xl font-black text-white tracking-tighter">{totalKmTravelled.toFixed(2)} KM</p>
            <button onClick={() => { setHasAcknowledged(false); setShowSummary(false); onStatusUpdate(ambulance.id, AmbulanceStatus.AVAILABLE); }} className="w-full uber-btn-primary py-5 mt-8 font-black italic">Confirmar QAP</button>
          </div>
        </div>
      )}

      <VoiceAssistantUI onStatusUpdate={(s) => onStatusUpdate(ambulance.id, s as AmbulanceStatus)} onOperationalLog={() => {}} driverName={driverName}/>
    </div>
  );
};

export default AmbulanceView;
