
import React, { useState, useCallback, useEffect } from 'react';
import { Ambulance, Incident, AmbulanceStatus, IncidentPriority, BaseType, ReferencePoint } from './types';
import DispatcherView from './components/DispatcherView';
import AmbulanceView from './components/AmbulanceView';
import MonitoringView from './components/MonitoringView';
import DownloadView from './components/DownloadView';
import HistoryView from './components/HistoryView';
import { ICONS } from './constants';
import { persistenceService } from './services/persistenceService';

const BASES_RO = [
  { 
    id: 'ari-samu', 
    name: 'Base Central SAMU', 
    type: BaseType.SAMU, 
    location: { lat: -9.91334, lng: -63.04105 },
    address: 'Rua Canindé, 3678 - Setor Institucional, Ariquemes - RO'
  },
  { 
    id: 'ari-hosp', 
    name: 'Hospital Regional', 
    type: BaseType.HOSPITAL, 
    location: { lat: -9.9077, lng: -63.0412 } 
  }
];

const REFERENCE_POINTS: ReferencePoint[] = [
  { id: 'pref-ari', name: 'Prefeitura Ariquemes', type: 'GOV', location: { lat: -9.9142, lng: -63.0375 } },
  { id: 'posto-central', name: 'Posto de Gasolina Shell', type: 'GAS', location: { lat: -9.9110, lng: -63.0405 } },
  { id: 'super-ig', name: 'Supermercado IG', type: 'MARKET', location: { lat: -9.9095, lng: -63.0380 } },
  { id: 'shopping-ari', name: 'Ariquemes Shopping', type: 'SHOP', location: { lat: -9.9205, lng: -63.0420 } },
  { id: 'itau-ari', name: 'Banco Itaú', type: 'BANK', location: { lat: -9.9130, lng: -63.0395 } },
  { id: 'camara-ari', name: 'Câmara Municipal', type: 'GOV', location: { lat: -9.9155, lng: -63.0360 } }
];

const INITIAL_AMBULANCES: Ambulance[] = [
  { id: 'usa-01', name: 'USA-01', type: 'Advanced', status: AmbulanceStatus.AVAILABLE, location: { lat: -9.91334, lng: -63.04105 }, lastUpdate: new Date() },
  { id: 'usb-02', name: 'USB-02', type: 'Basic', status: AmbulanceStatus.AVAILABLE, location: { lat: -9.91334, lng: -63.04105 }, lastUpdate: new Date() },
  { id: 'usb-03', name: 'USB-03', type: 'Basic', status: AmbulanceStatus.OUT_OF_SERVICE, location: { lat: -9.91334, lng: -63.04105 }, lastUpdate: new Date() },
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<'LOGIN' | 'DISPATCHER' | 'VIATURA_SETUP' | 'VIATURA_ACTIVE' | 'MONITORING' | 'DOWNLOAD' | 'HISTORY'>('LOGIN');
  const [ambulances, setAmbulances] = useState<Ambulance[]>(INITIAL_AMBULANCES);
  const [incidents, setIncidents] = useState<Incident[]>(persistenceService.getAllIncidents());
  const [selectedViaturaIndex, setSelectedViaturaIndex] = useState(0);
  const [driverName, setDriverName] = useState('');
  const [plate, setPlate] = useState('');

  // Tenta sincronizar com a nuvem no boot
  useEffect(() => {
    persistenceService.syncWithCloud().then(() => {
      setIncidents(persistenceService.getAllIncidents());
    });
  }, []);

  if (appState === 'LOGIN') {
    return (
      <div className="h-full bg-black flex flex-col justify-between p-8">
        <div className="mt-20">
          <div className="w-12 h-12 bg-white flex items-center justify-center rounded-lg mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <span className="text-black font-black text-xl">192</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white leading-none">SAMU<br/><span className="text-zinc-500">Ariquemes</span></h1>
        </div>

        <div className="space-y-3 mb-12">
          <button onClick={() => setAppState('DISPATCHER')} className="w-full uber-btn-primary py-4 shadow-xl shadow-white/5 active:scale-95 transition-transform">Regulação Médica</button>
          <button onClick={() => setAppState('VIATURA_SETUP')} className="w-full bg-[#1A1A1A] text-white font-bold py-4 rounded-lg active:scale-95 transition-transform">Check-in Viatura</button>
          <button onClick={() => setAppState('MONITORING')} className="w-full text-zinc-500 text-xs font-bold uppercase tracking-widest text-center mt-4 mb-2">Painel Estratégico</button>
          <div className="flex gap-2">
            <button onClick={() => setAppState('HISTORY')} className="flex-1 bg-zinc-900/50 border border-white/5 text-[10px] font-black uppercase text-zinc-400 py-3 rounded active:bg-zinc-800">Banco de Dados</button>
            <button onClick={() => setAppState('DOWNLOAD')} className="flex-1 bg-zinc-900/50 border border-white/5 text-[10px] font-black uppercase text-zinc-400 py-3 rounded active:bg-zinc-800">Instalação</button>
          </div>
        </div>
      </div>
    );
  }

  if (appState === 'DOWNLOAD') return <DownloadView onBack={() => setAppState('LOGIN')} />;
  if (appState === 'HISTORY') return <HistoryView onBack={() => setAppState('LOGIN')} />;

  if (appState === 'VIATURA_SETUP') {
    return (
      <div className="h-full bg-black flex flex-col p-8 animate-reveal">
        <button onClick={() => setAppState('LOGIN')} className="text-white mb-8">← Voltar</button>
        <h2 className="text-2xl font-bold mb-8">Setup da Viatura</h2>
        <div className="space-y-4">
          <select className="w-full uber-input" value={selectedViaturaIndex} onChange={e => setSelectedViaturaIndex(Number(e.target.value))}>
            {ambulances.map((a, i) => <option key={a.id} value={i}>{a.name}</option>)}
          </select>
          <input type="text" placeholder="Nome do Condutor" className="w-full uber-input" value={driverName} onChange={e => setDriverName(e.target.value)}/>
          <input type="text" placeholder="Placa" className="w-full uber-input uppercase" value={plate} onChange={e => setPlate(e.target.value)}/>
          <button onClick={() => setAppState('VIATURA_ACTIVE')} className="w-full uber-btn-primary py-4 mt-6">Iniciar Plantão</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      <header className="px-6 py-3 border-b border-white/5 flex justify-between items-center bg-black">
        <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">SAMU Connect Cloud</span>
        <button onClick={() => setAppState('LOGIN')} className="text-[10px] font-bold uppercase text-white">Sair</button>
      </header>

      <main className="flex-1 relative">
        {appState === 'DISPATCHER' && (
          <DispatcherView 
            ambulances={ambulances} 
            incidents={incidents.filter(i => !i.finishedAt)} 
            bases={BASES_RO} 
            onDispatch={async (i, a) => {
              setIncidents(prev => {
                const updated = prev.map(inc => inc.id === i ? {...inc, assignedAmbulanceId: a} : inc);
                const targeted = updated.find(x => x.id === i);
                if (targeted) persistenceService.updateIncident(targeted);
                return updated;
              });
              setAmbulances(prev => prev.map(amb => amb.id === a ? {...amb, status: AmbulanceStatus.DISPATCHED} : amb));
            }} 
            onAddIncident={async (d) => {
              const newInc: Incident = { 
                id: `inc-${Date.now()}`, 
                timestamp: new Date(), 
                description: d.description!, 
                priority: d.priority!, 
                location: d.location!, 
                type: 'Clinical', 
                occurrenceCode: d.code 
              };
              setIncidents(prev => [newInc, ...prev]);
              await persistenceService.saveIncident(newInc);
            }}
          />
        )}
        {appState === 'MONITORING' && <MonitoringView ambulances={ambulances} incidents={incidents} bases={BASES_RO} referencePoints={REFERENCE_POINTS} />}
        {appState === 'VIATURA_ACTIVE' && (
          <AmbulanceView 
            ambulance={ambulances[selectedViaturaIndex]} 
            assignedIncident={incidents.find(i => i.assignedAmbulanceId === ambulances[selectedViaturaIndex].id && !i.finishedAt)}
            bases={BASES_RO}
            onStatusUpdate={async (id, s) => {
               setAmbulances(prev => prev.map(a => a.id === id ? {...a, status: s} : a));
               if (s === AmbulanceStatus.AVAILABLE) {
                 const currentIncidents = [...incidents];
                 const index = currentIncidents.findIndex(i => i.assignedAmbulanceId === id && !i.finishedAt);
                 if (index > -1) {
                   const updated = { ...currentIncidents[index], finishedAt: new Date() };
                   await persistenceService.updateIncident(updated);
                   setIncidents(persistenceService.getAllIncidents());
                 }
               }
            }}
            driverName={driverName} plate={plate} initialKm="0"
          />
        )}
      </main>
    </div>
  );
};

export default App;
