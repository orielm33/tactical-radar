
export interface Coordinate {
  lat: number;
  lng: number;
}

export type RiskLevel = 'LOW' | 'MED' | 'HIGH';

export interface Threat {
  id: string;
  name: string;
  location: Coordinate;
  distance?: number;
  riskLevel: RiskLevel;
  lastIntel?: string;
}

export interface HFCAlert {
  id: string;
  area: string;
  time: string;
  date: string;
  type: string;
  isNew?: boolean;
  sourceUrl?: string;
}

export enum SystemStatus {
  STANDBY = 'STANDBY',
  INITIALIZING = 'INITIALIZING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR'
}
