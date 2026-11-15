export type UserRole = 'ADMIN' | 'DOCTOR' | 'NURSE';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string | null;
}

export interface LoginResponseData {
  user: AuthUser;
  accessToken: string;
}

export interface DoctorOption {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string | null;
}
