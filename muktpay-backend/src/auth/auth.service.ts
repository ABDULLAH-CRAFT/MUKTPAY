import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { IsNull, QueryFailedError, Repository } from 'typeorm';
import { PublicUser, toPublicUser, UsersService } from '../users/users.service';
import type { User } from '../users/user.entity';
import type { AccessTokenPayload, RefreshTokenPayload, RequestMeta } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshToken } from './refresh-token.entity';

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

const BCRYPT_COST = 12;
// Compared against when the email is unknown, so "no such user" takes as long as "wrong
// password" and login timing can't be used to discover which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('muktpay-timing-equaliser', BCRYPT_COST);

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken) private readonly refreshTokens: Repository<RefreshToken>,
  ) {}

  async register(dto: RegisterDto, meta: RequestMeta): Promise<AuthResponse> {
    if (await this.users.findByEmail(dto.email)) throw this.emailTaken();

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    try {
      const user = await this.users.create({ name: dto.name, email: dto.email, passwordHash });
      return this.issueTokens(user, meta);
    } catch (error) {
      // Two simultaneous sign-ups with one email: the unique index decides the winner.
      if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === '23505') {
        throw this.emailTaken();
      }
      throw error;
    }
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<AuthResponse> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const passwordOk = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);

    // One message for every failure: never reveal whether the email exists.
    if (!user || !passwordOk || !user.isActive) throw new UnauthorizedException('Invalid email or password');

    await this.users.touchLastLogin(user.id);
    return this.issueTokens(user, meta);
  }

  /**
   * Refresh-token rotation: every use revokes the presented token and issues a new pair.
   * If an already-revoked token is presented, someone is replaying a stolen/old token,
   * so every session of that user is revoked and they must log in again.
   */
  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthResponse> {
    const invalid = () => new UnauthorizedException('Invalid refresh token');

    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw invalid();
    }

    const stored = await this.refreshTokens.findOne({ where: { id: payload.jti } });
    if (!stored || stored.userId !== payload.sub || stored.tokenHash !== sha256(refreshToken)) throw invalid();

    if (stored.revokedAt) {
      await this.revokeAllForUser(stored.userId);
      throw invalid();
    }
    if (stored.expiresAt.getTime() <= Date.now()) throw invalid();

    const user = await this.users.findById(stored.userId);
    if (!user || !user.isActive) throw invalid();

    // Atomic "claim": only one of two concurrent refreshes can flip revokedAt from NULL.
    const claimed = await this.refreshTokens.update({ id: stored.id, revokedAt: IsNull() }, { revokedAt: new Date() });
    if (claimed.affected !== 1) throw invalid();

    return this.issueTokens(user, meta);
  }

  /** Idempotent: logging out with a bad or expired token is not an error. */
  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      await this.refreshTokens.update({ id: payload.jti, userId: payload.sub, revokedAt: IsNull() }, { revokedAt: new Date() });
    } catch {
      // nothing to revoke
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.revokeAllForUser(userId);
  }

  // ---------------------------------------------------------------------------

  private revokeAllForUser(userId: string) {
    return this.refreshTokens.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  private emailTaken() {
    return new ConflictException('An account with this email already exists');
  }

  private async issueTokens(user: User, meta: RequestMeta): Promise<AuthResponse> {
    const accessPayload: AccessTokenPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m') as JwtSignOptions['expiresIn'],
    });

    const tokenId = randomUUID();
    const refreshPayload: RefreshTokenPayload = { sub: user.id, jti: tokenId };
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '30d') as JwtSignOptions['expiresIn'],
    });
    const { exp } = this.jwt.decode<{ exp: number }>(refreshToken);

    await this.refreshTokens.insert({
      id: tokenId,
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(exp * 1000),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    return { user: toPublicUser(user), accessToken, refreshToken };
  }
}
