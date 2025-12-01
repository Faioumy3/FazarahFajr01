export interface AttendanceRecord {
  date: string;
  mosque: string;
  imam: string;
}

export interface UserMessage {
  id: string;
  date: string;
  content: string;
}

export interface User {
  id: string;
  fullName: string;
  phoneNumber: string;
  password?: string; // stored plainly for this demo, in prod use hash
  streak: number;
  lastCheckIn: string | null; // ISO Date string
  history: string[]; // Array of dates checked in
  attendanceLog?: AttendanceRecord[]; // Detailed history with mosque/imam
  claimedReward: boolean;
  messages?: UserMessage[]; // Communication with admin
}

export enum ViewState {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  DASHBOARD = 'DASHBOARD',
  ADMIN = 'ADMIN'
}

export interface AttendanceStatus {
  isOpen: boolean;
  message: string;
  fajrTime: string; // HH:mm
  currentTime: string; // HH:mm
}