// Tipo de propulsión
export enum DriveType {
  ELECTRIC = 'electric',
  HYBRID = 'hybrid',
  ICE = 'combustion',
}

// Información de motor de combustión
export interface Combustion {
  fuelType: string;
  displacement?: string;
  power: string;
  torque: string;
  consumption?: string;
  emissions?: string;
}

// Información de lanzamiento
export interface LaunchInfo {
  announced: string;
  released: string;
}

// Estado del coche
export type CarStatus = 'Discontinued' | 'Available to order' | string;

// Precio base
export interface Price {
  currency: string;
  amount?: number;
}

// Prestaciones
export interface Performance {
  power: string;
  torque: string;
  acceleration: string;
  maxSpeed: string;
}

// Batería (eléctricos e híbridos)
export interface Battery {
  capacity: string;
  tech: string;
  range: string;
  consumption: string;
  recuperation?: string;
  heatPump: boolean;
}

// Carga
export interface ACCharging {
  type: string;
  power: string;
  duration?: string;
}
export interface ChargingPort {
  type: string;
  power: string;
  duration: string;
}
export interface DCCharging {
  supercharger?: ChargingPort;
  ccs?: ChargingPort;
}
export interface V2L {
  type: string;
  power: string;
}
export interface Charging {
  ac: ACCharging;
  dc: DCCharging;
  v2l?: V2L;
}

// Carrocería, dimensiones y pesos
export interface Body {
  type: string;
  seats: number;
  platform?: string;
}
export interface Dimensions {
  length: string;
  width: string;
  height: string;
  dragCoefficient?: string;
  wheelbase: string;
  clearance?: string;
}
export interface Weight {
  unladen: string;
  gross?: string;
}

// Resto de especificaciones
export interface Suspension {
  front: string;
  rear: string;
}
export interface Cargo {
  trunk: string;
  frunk?: string;
  towing?: string;
}
export interface Displays {
  center: string;
  driver: string;
  headUp: boolean;
}
export interface Comfort {
  seats: string;
  roof: string;
  parkingAids: string;
  connectivity?: string;
}
export interface Safety {
  airbags: string;
  drivingAids: string;
  selfDriving?: string;
  crashTests?: string;
  dvr?: boolean;
}

// Interfaz principal
export interface CarSpecs {
  model: string;
  generation?: string;
  market?: string;
  alsoKnownAs?: string[];
  driveType: DriveType;

  // Sólo uno de estos dos:
  battery?: Battery;
  combustion?: Combustion;

  launch: LaunchInfo;
  status: CarStatus;
  basePrices: Price;
  performance: Performance;
  body: Body;
  dimensions: Dimensions;
  weight: Weight;
  suspension: Suspension;
  Wheels: Wheel[];
  cargo: Cargo;
  displays: Displays;
  comfort: Comfort;
  safety: Safety;
}

export interface Wheel {
  name: string;
  size: string;
}
