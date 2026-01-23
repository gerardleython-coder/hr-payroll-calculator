export interface User {
  id: string;
  username: string;
  role: string;
}

export interface UserWithPassword extends User {
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}
