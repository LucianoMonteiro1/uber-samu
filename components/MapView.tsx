
import React, { useEffect, useRef, memo } from 'react';
import { Ambulance, Incident, Location, Base, TrafficPoint, BaseType, ReferencePoint } from '../types';
import { MAP_MARKERS, getAmbulanceMarker, getIncidentMarker, getReferenceMarker } from '../constants';

declare const L: any;

interface MapViewProps {
  ambulances: Ambulance[];
  incidents: Incident[];
  bases?: Base[];
  referencePoints?: ReferencePoint[];
  trafficPoints?: TrafficPoint[];
  center?: Location;
  isViatura?: boolean;
  onIncidentHover?: (incident: Incident | null) => void;
  showHeatmap?: boolean;
  heatmapData?: number[][];
}

const MapView: React.FC<MapViewProps> = memo(({ 
  ambulances, 
  incidents, 
  bases = [], 
  referencePoints = [], 
  trafficPoints = [], 
  center, 
  isViatura, 
  onIncidentHover,
  showHeatmap = false,
  heatmapData = []
}) => {
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const clusterGroup = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);

  // Inicialização do Mapa
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const startPos = center || { lat: -9.9123, lng: -63.0391 };
    leafletMap.current = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      markerZoomAnimation: true,
      inertia: true,
      wheelDebounceTime: 150
    }).setView([startPos.lat, startPos.lng], isViatura ? 18 : 15);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(leafletMap.current);

    clusterGroup.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: isViatura ? 16 : 18,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div class="bg-black text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white/20 shadow-xl">${count}</div>`,
          className: 'custom-cluster-icon',
          iconSize: [24, 24]
        });
      }
    }).addTo(leafletMap.current);

    return () => { 
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [isViatura]);

  // Atualização Dinâmica de Entidades
  useEffect(() => {
    if (!leafletMap.current) return;

    if (center) {
      if (isViatura) {
        leafletMap.current.flyTo([center.lat, center.lng], 18, { animate: true, duration: 0.8 });
      } else {
        leafletMap.current.panTo([center.lat, center.lng]);
      }
    }

    const currentIds = new Set<string>();

    // 0. Renderizar Heatmap
    if (showHeatmap && heatmapData.length > 0) {
      if (heatLayerRef.current) {
        leafletMap.current.removeLayer(heatLayerRef.current);
      }
      heatLayerRef.current = L.heatLayer(heatmapData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red'}
      }).addTo(leafletMap.current);
    } else if (heatLayerRef.current) {
      leafletMap.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // 1. Renderizar Bases e Hospitais
    bases.forEach(base => {
      const id = `base-${base.id}`;
      currentIds.add(id);
      if (!markersRef.current[id]) {
        const iconHtml = base.type === BaseType.SAMU ? MAP_MARKERS.SamuBase : MAP_MARKERS.Hospital;
        const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [14, 14], iconAnchor: [7, 7] });
        const marker = L.marker([base.location.lat, base.location.lng], { icon });
        markersRef.current[id] = marker;
        clusterGroup.current.addLayer(marker);
      }
    });

    // 2. Renderizar Pontos de Referência 3D (CUBOS)
    referencePoints.forEach(poi => {
      const id = `poi-${poi.id}`;
      currentIds.add(id);
      if (!markersRef.current[id]) {
        const iconHtml = getReferenceMarker(poi);
        const icon = L.divIcon({ 
          html: iconHtml, 
          className: '', 
          iconSize: [100, 40], 
          iconAnchor: [50, 40] 
        });
        const marker = L.marker([poi.location.lat, poi.location.lng], { icon });
        markersRef.current[id] = marker;
        clusterGroup.current.addLayer(marker);
      }
    });

    // 3. Renderizar Viaturas
    ambulances.forEach(amb => {
      currentIds.add(amb.id);
      const iconHtml = getAmbulanceMarker(amb.status, amb.location.heading || 0);
      const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [40, 40], iconAnchor: [20, 20] });
      if (markersRef.current[amb.id]) {
        markersRef.current[amb.id].setLatLng([amb.location.lat, amb.location.lng]);
        markersRef.current[amb.id].setIcon(icon);
      } else {
        const marker = L.marker([amb.location.lat, amb.location.lng], { icon });
        markersRef.current[amb.id] = marker;
        clusterGroup.current.addLayer(marker);
      }
    });

    // 4. Renderizar Ocorrências (Só mostra se não estiver no modo Heatmap para não poluir)
    if (!showHeatmap) {
      incidents.forEach(inc => {
        currentIds.add(inc.id);
        const iconHtml = getIncidentMarker(inc);
        const icon = L.divIcon({ html: iconHtml, iconSize: [20, 20], iconAnchor: [10, 10], className: '' });
        if (markersRef.current[inc.id]) {
          markersRef.current[inc.id].setIcon(icon);
        } else {
          const marker = L.marker([inc.location.lat, inc.location.lng], { icon });
          if (onIncidentHover) {
            marker.on('mouseover', () => onIncidentHover(inc));
            marker.on('mouseout', () => onIncidentHover(null));
          }
          markersRef.current[inc.id] = marker;
          clusterGroup.current.addLayer(marker);
        }
      });
    }

    // 5. Limpeza
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        clusterGroup.current.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });

    // 6. Rota
    if (isViatura && ambulances.length > 0 && incidents.length > 0) {
      const activeInc = incidents.find(i => !i.finishedAt);
      if (activeInc) {
        const amb = ambulances[0];
        const routeCoords = [[amb.location.lat, amb.location.lng], [activeInc.location.lat, activeInc.location.lng]];
        if (routeLayerRef.current) {
          routeLayerRef.current.setLatLngs(routeCoords);
        } else {
          routeLayerRef.current = L.polyline(routeCoords, { color: '#FF1744', weight: 4, opacity: 0.6, dashArray: '8, 12', lineJoin: 'round' }).addTo(leafletMap.current);
        }
      }
    }
  }, [ambulances, incidents, center, isViatura, onIncidentHover, bases, referencePoints, showHeatmap, heatmapData]);

  return (
    <div ref={mapWrapperRef} className={`w-full h-full relative overflow-hidden ${isViatura ? 'map-navigation-3d' : ''}`}>
      <div ref={mapRef} className="w-full h-full absolute inset-0" />
      <style>{`
        .map-navigation-3d { perspective: 1200px; }
        .map-navigation-3d .leaflet-container { transform: rotateX(25deg); transform-origin: bottom; height: 120% !important; top: -10%; }
        
        .ref-poi-container { display: flex; flex-direction: column; align-items: center; position: relative; }
        .poi-cube { width: 12px; height: 12px; position: relative; transform-style: preserve-3d; transform: rotateX(-20deg) rotateY(45deg); margin-bottom: 4px; }
        .cube-face { position: absolute; width: 12px; height: 12px; border: 1px solid rgba(255,255,255,0.1); background: var(--cube-color); opacity: 0.8; }
        .front { transform: rotateY(0deg) translateZ(6px); }
        .back { transform: rotateY(180deg) translateZ(6px); }
        .right { transform: rotateY(90deg) translateZ(6px); }
        .left { transform: rotateY(-90deg) translateZ(6px); }
        .top { transform: rotateX(90deg) translateZ(6px); filter: brightness(1.2); }
        .bottom { transform: rotateX(-90deg) translateZ(6px); filter: brightness(0.8); }
        .poi-label { background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); white-space: nowrap; transform: translateY(-2px); }
        .poi-name { color: white; font-size: 8px; font-weight: 800; text-transform: uppercase; }
        .custom-cluster-icon { display: flex; align-items: center; justify-content: center; }
      `}</style>
    </div>
  );
});

export default MapView;
