
import React, { useState, useMemo } from 'react';
import { Ambulance, Incident, Base, AmbulanceStatus, Location, IncidentPriority, ReferencePoint } from '../types';
import MapView from './MapView';
import { getStatusColor } from '../constants';
import { persistenceService } from '../services/persistenceService';

interface MonitoringViewProps {
  ambulances: Ambulance[];
  incidents: Incident[];
  bases: Base[];
  referencePoints?: ReferencePoint[];
}

const MonitoringView: React.FC<MonitoringViewProps> = ({ ambulances, incidents, bases, referencePoints = [] }) => {
  const [selectedLocation, setSelectedLocation] = useState<Location | undefined>(undefined);
  const [hoveredIncident, setHoveredIncident] = useState<Incident | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showHeatmap, setShowHeatmap] = useState(false);

  const onlineAmbulances = ambulances.filter(a => a.status !== AmbulanceStatus.OUT_OF_SERVICE);
  
  // Dados do banco para o heatmap
  const heatmapPoints = useMemo(() => persistenceService.getHeatmapData(), [incidents]);

  const filteredIncidents = useMemo(() => {
    const now = new Date().getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return incidents.filter(i => {
      if (!i.finishedAt) return true;
      return (now - new Date(i.finishedAt).getTime()) < twentyFourHours;
    });
  }, [incidents]);

  const stats = useMemo(() => {
    return {
      waiting: filteredIncidents.filter(i => !i.assignedAmbulanceId && !i.finishedAt).length,
      active: filteredIncidents.filter(i => i.assignedAmbulanceId && !i.finishedAt).length,
      finished: filteredIncidents.filter(i => !!i.finishedAt).length
    };
  }, [filteredIncidents]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="relative h-full w-full bg-black flex flex-col md:flex-row overflow-hidden" onMouseMove={handleMouseMove}>
      <div className="w-full md:w-80 h-1/3 md:h-full bg-black border-r border-white/5 flex flex-col z-10">
        <div className="p-6 border-b border-white/5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Monitoramento</h2>
              <p className="text-[10px] text-zinc-500 uppercase font-medium mt-1">Frota Ativa: {onlineAmbulances.length}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-red-500 uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div> {stats.waiting} Aguardando
              </span>
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-orange-500 uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> {stats.active} Ativos
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
              showHeatmap ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 border-white/10 text-zinc-500'
            }`}
          >
            {showHeatmap ? '🔥 Mapa de Calor Ativo' : 'Visualizar Mancha de Calor'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar bg-black/40">
          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest px-2 mb-2">Viaturas Online</p>
          {onlineAmbulances.map(amb => (
            <button 
              key={amb.id}
              onClick={() => setSelectedLocation(amb.location)}
              className="w-full text-left p-4 rounded-xl bg-[#0a0a0a] border border-white/5 hover:border-white/20 transition-all group"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getStatusColor(amb.status) }}></div>
                  <span className="text-xs font-black text-white uppercase tracking-tighter">{amb.name}</span>
                </div>
                <span className="text-[8px] text-zinc-500 font-bold px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-full uppercase">{amb.status}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 h-2/3 md:h-full relative">
        <MapView 
          ambulances={onlineAmbulances} 
          incidents={filteredIncidents} 
          bases={bases} 
          referencePoints={referencePoints}
          center={selectedLocation}
          onIncidentHover={(inc) => setHoveredIncident(inc)}
          showHeatmap={showHeatmap}
          heatmapData={heatmapPoints}
        />
        
        <div className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/5 h-14 flex items-center overflow-hidden px-6 z-20">
          <div className="flex animate-marquee whitespace-nowrap items-center gap-16 text-[10px] font-black uppercase tracking-[0.2em]">
            {filteredIncidents.length === 0 && <span className="text-zinc-700">Rede Operacional Estável - Sem ocorrências recentes</span>}
            {filteredIncidents.map(inc => (
              <span key={inc.id} className="flex items-center gap-3 opacity-70">
                <span className="opacity-50 font-mono">[{inc.occurrenceCode || inc.id.slice(-4)}]</span>
                <span>{inc.description}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringView;
