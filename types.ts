
export enum AmbulanceStatus {
  AVAILABLE = 'Disponível',
  DISPATCHED = 'Em Despacho',
  EN_ROUTE = 'A Caminho',
  AT_SCENE = 'No Local',
  TRANSPORTING = 'Transportando',
  AT_HOSPITAL = 'No Hospital',
  OUT_OF_SERVICE = 'Fora de Serviço'
}

export enum IncidentPriority {
  LOW = 'Verde',
  MEDIUM = 'Amarelo',
  HIGH = 'Vermelho',
  CRITICAL = 'Azul'
}

export enum BaseType {
  SAMU = 'SAMU',
  FIRE_DEPT = 'Bombeiros',
  HOSPITAL = 'Hospital',
  UPA = 'UPA'
}

export interface Location {
  lat: number;
  lng: number;
  heading?: number;
}

export interface ReferencePoint {
  id: string;
  name: string;
  type: 'GAS' | 'HOSPITAL' | 'GOV' | 'SHOP' | 'MARKET' | 'BANK';
  location: Location;
}

export interface SearchMatch {
  address: string;
  city: string;
  lat: number;
  lng: number;
}

export interface TrafficPoint {
  lat: number;
  lng: number;
  intensity: 'MODERATE' | 'HEAVY' | 'STALLED';
  description: string;
}

export interface OperationalLog {
  departureTime?: Date;
  arrivalTimeAtScene?: Date;
  departureFromSceneTime?: Date;
  arrivalAtHospitalTime?: Date;
  finishTime?: Date;
  initialKm: number;
  finalKm?: number;
  totalDistanceTraveled: number;
  durationTravelToScene?: number; // em minutos
  durationAtScene?: number; // em minutos
  durationTransportToHospital?: number; // em minutos
}

export interface Base {
  id: string;
  name: string;
  type: BaseType;
  location: Location;
  address?: string;
  phone?: string;
}

export interface Incident {
  id: string;
  patientName?: string;
  description: string;
  priority: IncidentPriority;
  location: Location;
  timestamp: Date;
  finishedAt?: Date; // Campo para controle de 24h
  assignedAmbulanceId?: string;
  type: 'Clinical' | 'Traffic';
  occurrenceCode?: string;
  log?: OperationalLog;
}

export interface Ambulance {
  id: string;
  name: string;
  type: 'Advanced' | 'Basic';
  status: AmbulanceStatus;
  location: Location;
  lastUpdate: Date;
}

export type ViewMode = 'DISPATCHER' | 'VIATURA' | 'MONITORING';
