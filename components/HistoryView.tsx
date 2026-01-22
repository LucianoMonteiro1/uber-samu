
import React, { useState, useMemo, useEffect } from 'react';
import { persistenceService } from '../services/persistenceService';
import { Incident } from '../types';
import { ICONS } from '../constants';

interface HistoryViewProps {
  onBack: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onBack }) => {
  const [incidents, setIncidents] = useState<(Incident & { syncStatus?: string })[]>(persistenceService.getAllIncidents());
  const [filter, setFilter] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'LIST' | 'ANALYTICS'>('LIST');

  const filtered = useMemo(() => {
    return incidents.filter(i => 
      i.description.toLowerCase().includes(filter.toLowerCase()) ||
      i.occurrenceCode?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [incidents, filter]);

  const stats = useMemo(() => {
    const months = persistenceService.getStatsByMonth();
    const total = incidents.length;
    const synced = incidents.filter(i => i.syncStatus === 'synced').length;
    
    return {
      total,
      synced,
      pending: total - synced,
      months: Object.entries(months).reverse()
    };
  }, [incidents]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await persistenceService.syncWithCloud();
    setIncidents(persistenceService.getAllIncidents());
    setIsSyncing(false);
  };

  return (
    <div className="h-full bg-black flex flex-col p-8 animate-reveal overflow-y-auto no-scrollbar">
      <header className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-white flex items-center gap-2 group">
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span className="text-xs font-bold uppercase tracking-widest">Painel SAMU</span>
        </button>
        <div className="flex gap-2">
           <button 
            onClick={handleManualSync} 
            disabled={isSyncing}
            className={`text-[9px] font-black uppercase px-4 py-2 rounded flex items-center gap-2 transition-all ${
              isSyncing ? 'bg-zinc-800 text-zinc-600' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20'
            }`}
          >
            {isSyncing ? 'Sincronizando...' : 'Nuvem Ativa'}
            <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-zinc-600 animate-pulse' : 'bg-white'}`}></div>
          </button>
        </div>
      </header>

      {/* Cloud Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="uber-glass p-5 border-white/5 bg-[#080808]">
          <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1">Total Anual</p>
          <p className="text-3xl font-black text-white italic">{stats.total}</p>
        </div>
        <div className="uber-glass p-5 border-white/5 bg-[#080808]">
          <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1">Sincronizados</p>
          <p className="text-3xl font-black text-green-500 italic">{stats.synced}</p>
        </div>
        <div className="uber-glass p-5 border-white/5 bg-[#080808]">
          <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1">Pendentes</p>
          <p className="text-3xl font-black text-orange-500 italic">{stats.pending}</p>
        </div>
        <div className="uber-glass p-5 border-white/5 bg-[#080808]">
          <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1">Retenção</p>
          <p className="text-3xl font-black text-white/20 italic">365d</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-white/5 mb-8">
        <button 
          onClick={() => setActiveTab('LIST')}
          className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'LIST' ? 'text-white border-b-2 border-white' : 'text-zinc-600'}`}
        >
          Logs da Nuvem
        </button>
        <button 
          onClick={() => setActiveTab('ANALYTICS')}
          className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ANALYTICS' ? 'text-white border-b-2 border-white' : 'text-zinc-600'}`}
        >
          Estatísticas
        </button>
      </div>

      {activeTab === 'LIST' ? (
        <>
          <div className="mb-6">
            <input 
              type="text" 
              placeholder="Buscar por código, paciente ou descrição..." 
              className="w-full uber-input border-white/5 focus:border-white/20"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {filtered.map(inc => (
              <div key={inc.id} className="uber-glass p-5 border-white/5 bg-[#0a0a0a] group relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-1 h-full ${inc.syncStatus === 'synced' ? 'bg-green-500/20' : 'bg-orange-500 animate-pulse'}`}></div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-red-600 italic uppercase">{inc.occurrenceCode}</span>
                    {inc.syncStatus === 'synced' && <span className="text-[8px] bg-green-900/30 text-green-500 px-1.5 py-0.5 rounded font-bold uppercase">Cloud OK</span>}
                  </div>
                  <span className="text-[9px] text-zinc-600 font-mono">{new Date(inc.timestamp).toLocaleString('pt-BR')}</span>
                </div>
                <h3 className="text-white font-bold text-sm mb-1 leading-snug">"{inc.description}"</h3>
                <div className="flex justify-between items-center mt-4">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-medium">
                    {inc.finishedAt ? `Status: Concluída` : 'Status: Em aberto'}
                  </p>
                  <button className="text-[8px] font-black text-white/20 uppercase hover:text-white transition-colors">Detalhes do Log</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-20">
                <p className="text-zinc-800 font-black uppercase tracking-[0.5em] text-sm">Base de dados vazia</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6 animate-reveal">
          <div className="uber-glass p-8 border-white/5 bg-[#050505]">
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-8">Volume de Atendimento Mensal</h4>
            <div className="space-y-4">
              {stats.months.map(([month, count]) => (
                <div key={month} className="group">
                  <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase mb-2">
                    <span>{month}</span>
                    <span className="text-white">{count} Chamados</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-600 transition-all duration-1000" 
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-8 text-center bg-zinc-950 rounded-2xl border border-white/5">
            <p className="text-[10px] text-zinc-600 font-bold uppercase mb-4">Exportação Auditoria</p>
            <button 
              onClick={() => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(incidents));
                const a = document.createElement('a');
                a.href = dataStr;
                a.download = `backup_samu_anual_${new Date().getFullYear()}.json`;
                a.click();
              }}
              className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-lg"
            >
              Gerar Relatório Completo (JSON)
            </button>
          </div>
        </div>
      )}
      
      <div className="mt-12 py-8 border-t border-white/5 text-center">
        <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">
          Sincronização Criptografada End-to-End • Servidor: Ariquemes-01
        </p>
      </div>
    </div>
  );
};

export default HistoryView;
