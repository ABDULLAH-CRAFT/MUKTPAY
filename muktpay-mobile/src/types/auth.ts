export interface User {
  id: string;
  name: string;
  email: string;
  /** True once the person has entered the code we emailed them. */
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
