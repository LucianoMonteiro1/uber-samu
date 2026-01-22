
import { Incident } from '../types';

const LOCAL_STORAGE_KEY = 'samu_connect_local_cache';
const CLOUD_STORAGE_SIM_KEY = 'samu_connect_cloud_db';
const RETENTION_DAYS = 365;

export interface CloudMetadata {
  syncStatus: 'synced' | 'pending' | 'error';
  lastSync?: Date;
  version: number;
}

export const persistenceService = {
  // Salva uma nova ocorrência localmente e tenta "sincronizar"
  saveIncident: async (incident: Incident) => {
    try {
      const history = persistenceService.getAllIncidents();
      const newEntry = { 
        ...incident, 
        syncStatus: 'pending' as const,
        metadata: { version: 1 } 
      };
      
      const updated = [newEntry, ...history];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      
      // Simula tentativa de upload imediato
      return await persistenceService.syncWithCloud();
    } catch (e) {
      console.error("Erro no CloudDatabase:", e);
    }
  },

  updateIncident: async (incident: Incident) => {
    try {
      const history = persistenceService.getAllIncidents();
      const updated = history.map(i => i.id === incident.id ? { ...incident, syncStatus: 'pending' } : i);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return await persistenceService.syncWithCloud();
    } catch (e) {
      console.error("Erro ao atualizar CloudDatabase:", e);
    }
  },

  // Motor de sincronização simulado
  syncWithCloud: async (): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const localData = persistenceService.getAllIncidents();
        const pending = localData.filter(i => i.syncStatus === 'pending');
        
        if (pending.length === 0) return resolve(true);

        // Movemos os dados para o "Banco em Nuvem" (outra chave no storage)
        const cloudDataRaw = localStorage.getItem(CLOUD_STORAGE_SIM_KEY);
        let cloudData: any[] = cloudDataRaw ? JSON.parse(cloudDataRaw) : [];
        
        const syncedData = localData.map(incident => {
          if (incident.syncStatus === 'pending') {
            const synced = { ...incident, syncStatus: 'synced' as const, lastSync: new Date() };
            // Atualiza ou insere na nuvem
            const index = cloudData.findIndex(ci => ci.id === synced.id);
            if (index > -1) cloudData[index] = synced;
            else cloudData.push(synced);
            return synced;
          }
          return incident;
        });

        // Aplica política de retenção de 1 ano na nuvem
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - RETENTION_DAYS);
        const filteredCloud = cloudData.filter(i => new Date(i.timestamp) > oneYearAgo);

        localStorage.setItem(CLOUD_STORAGE_SIM_KEY, JSON.stringify(filteredCloud));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(syncedData));
        
        console.log(`[CloudDB] Sincronizados ${pending.length} registros. Retenção ativa: registros pré-${oneYearAgo.toLocaleDateString()} removidos.`);
        resolve(true);
      }, 1500); // Simula latência de rede
    });
  },

  getAllIncidents: (): (Incident & { syncStatus?: string })[] => {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return parsed.map((i: any) => ({
        ...i,
        timestamp: new Date(i.timestamp),
        finishedAt: i.finishedAt ? new Date(i.finishedAt) : undefined
      }));
    } catch {
      return [];
    }
  },

  getStatsByMonth: () => {
    const history = persistenceService.getAllIncidents();
    const months: { [key: string]: number } = {};
    
    history.forEach(inc => {
      const date = new Date(inc.timestamp);
      const key = `${date.getMonth() + 1}/${date.getFullYear()}`;
      months[key] = (months[key] || 0) + 1;
    });
    
    return months;
  },

  getHeatmapData: () => {
    const history = persistenceService.getAllIncidents();
    return history.map(i => [i.location.lat, i.location.lng, 0.5]);
  }
};
