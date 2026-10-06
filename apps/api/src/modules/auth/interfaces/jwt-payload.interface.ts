import { UserRole } from '@dos/shared-types';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: UserRole;
}
