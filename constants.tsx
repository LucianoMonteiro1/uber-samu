
import React from 'react';
import { AmbulanceStatus, Incident, ReferencePoint } from './types';

export const ICONS = {
  Ambulance: ({ thick = false }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`${thick ? 'w-6 h-6' : 'w-4 h-4'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="10" width="22" height="8" rx="2" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
      <path d="M7 10V8a2 2 0 0 1 2-2h9" />
    </svg>
  ),
  Download: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Map: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    </svg>
  ),
  Microphone: ({ thick = false }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`${thick ? 'w-6 h-6' : 'w-4 h-4'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    </svg>
  ),
  Alert: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
};

export const getStatusColor = (status: AmbulanceStatus): string => {
  switch (status) {
    case AmbulanceStatus.AVAILABLE:
      return '#22c55e';
    case AmbulanceStatus.DISPATCHED:
    case AmbulanceStatus.EN_ROUTE:
      return '#ef4444';
    case AmbulanceStatus.AT_SCENE:
    case AmbulanceStatus.TRANSPORTING:
      return '#f97316';
    case AmbulanceStatus.AT_HOSPITAL:
      return '#3b82f6';
    default:
      return '#52525b';
  }
};

export const getAmbulanceMarker = (status: AmbulanceStatus, heading: number = 0) => {
  const color = getStatusColor(status);
  return `
    <div class="relative flex items-center justify-center" style="transform: rotate(${heading}deg); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);">
      <div class="absolute w-12 h-12 rounded-full opacity-10 animate-pulse" style="background-color: ${color}"></div>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.5));">
        <path d="M12 2L4 21L12 17L20 21L12 2Z" fill="${color}" stroke="white" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    </div>
  `;
};

export const getIncidentMarker = (incident: Incident) => {
  if (incident.finishedAt) {
    return `
      <div class="relative flex items-center justify-center w-4 h-4">
        <div class="absolute inset-0 bg-white/20 rounded-full"></div>
        <div class="relative w-2 h-2 bg-white border border-black/20 rounded-full shadow-sm"></div>
      </div>
    `;
  }
  
  if (incident.assignedAmbulanceId) {
    return `
      <div class="relative flex items-center justify-center w-4 h-4">
        <div class="absolute inset-0 bg-orange-500/20 rounded-full"></div>
        <div class="relative w-2.5 h-2.5 bg-orange-500 border border-white rounded-full shadow-md"></div>
      </div>
    `;
  }

  return `
    <div class="relative flex items-center justify-center w-5 h-5">
      <div class="absolute inset-0 bg-red-600 rounded-full opacity-40 animate-ping"></div>
      <div class="relative w-3 h-3 bg-red-600 border-2 border-white rounded-full shadow-[0_0_10px_#ef4444]"></div>
    </div>
  `;
};

/**
 * Retorna um marcador de referência (POI) em formato 3D (Cubo com nome)
 */
export const getReferenceMarker = (point: ReferencePoint) => {
  const colors = {
    GAS: '#fbbf24',
    HOSPITAL: '#ef4444',
    GOV: '#3b82f6',
    SHOP: '#a855f7',
    MARKET: '#22c55e',
    BANK: '#64748b'
  };
  const color = colors[point.type] || '#fff';

  return `
    <div class="ref-poi-container">
      <div class="poi-cube" style="--cube-color: ${color}">
        <div class="cube-face front"></div>
        <div class="cube-face back"></div>
        <div class="cube-face right"></div>
        <div class="cube-face left"></div>
        <div class="cube-face top"></div>
        <div class="cube-face bottom"></div>
        <div class="poi-center-dot"></div>
      </div>
      <div class="poi-label">
        <span class="poi-name">${point.name}</span>
      </div>
    </div>
  `;
};

export const MAP_MARKERS = {
  SamuBase: `<div style="width: 14px; height: 14px; background: #000; border: 1px solid white; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 900; color: white;">S</div>`,
  Hospital: `<div style="width: 14px; height: 14px; background: #000; border: 1px solid white; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 900; color: white;">H</div>`
};
