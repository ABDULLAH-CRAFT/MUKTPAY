/** What the JWT guard attaches to request.user. */
export interface AuthUser {
  id: string;
  email: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export interface RefreshTokenPayload {
  sub: string;
  /** id of the row in refresh_tokens */
  jti: string;
}

export interface RequestMeta {
  userAgent: string | null;
  ipAddress: string | null;
}
