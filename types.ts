
export enum ParcelStatus {
  PENDING = 'PENDING',
  COLLECTED = 'COLLECTED'
}

export interface User {
  id: string;
  name: string;
  email?: string;
  password?: string;
  role: 'STAFF' | 'RESIDENT';
  unit?: string;
  phone?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  author: string;
}

export interface Resident {
  id: string;
  name: string;
  unit: string;
  phone: string;
  email?: string;
  createdAt?: string;
}

export interface Parcel {
  id: string;
  recipientName: string;
  unit: string;
  carrier: string;
  receivedAt: string;
  collectedAt?: string;
  collectedBy?: string;
  status: ParcelStatus;
  description?: string;
}

export interface Notification {
  id: string;
  parcelId: string;
  message: string;
  timestamp: string;
  read: boolean;
  unit: string;
}

export type ViewMode = 'STAFF' | 'RESIDENT' | 'WELCOME' | 'AUTH_STAFF' | 'AUTH_RESIDENT';
