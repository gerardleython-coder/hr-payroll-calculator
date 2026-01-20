import type { UserWithPassword } from '../models/user.model';

/**
 * Hardcoded admin user for authentication.
 * In a production environment, this should be stored in a database with hashed password.
 * For this implementation, we keep it simple without bcrypt to avoid over-engineering.
 */
export const ADMIN_USER: UserWithPassword = {
  id: 'admin-001',
  username: 'admin',
  password: 'admin123',
  role: 'ADMIN',
};
