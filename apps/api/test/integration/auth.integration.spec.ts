import { UserRole } from '@dos/shared-types';
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';

import { AuthController } from '../../src/modules/auth/auth.controller';
import { AuthService } from '../../src/modules/auth/auth.service';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { configureHttpApplication } from '../../src/shared/http/configure-http-app';

type SessionRecord = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    phone: string;
    name: string | null;
    preferredLanguage: string;
    preferredCurrency: string;
  };
  role: UserRole;
};

class AllowThrottlerGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

class AuthServiceDouble {
  private readonly refreshSessions = new Map<string, SessionRecord>();

  private readonly accessSessions = new Map<string, SessionRecord>();

  private readonly activeRefreshTokenByUser = new Map<string, string>();

  async sendOtp(): Promise<{ expiresInSeconds: number; devCode: string }> {
    return {
      expiresInSeconds: 300,
      devCode: '1234',
    };
  }

  async verifyOtp(
    phone: string,
    code: string,
    role: UserRole,
  ): Promise<SessionRecord> {
    if (code !== '1234') {
      throw new UnauthorizedException({
        code: 'OTP_INVALID',
        message: 'OTP code is invalid or expired',
      });
    }

    const session = this.createSession(phone, role);
    this.storeSession(session);
    return session;
  }

  async refresh(refreshToken: string): Promise<SessionRecord> {
    const current = this.refreshSessions.get(refreshToken);
    if (!current) {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_REVOKED',
        message: 'Refresh token has been revoked',
      });
    }

    this.revokeSession(current);
    const rotated = this.createSession(current.user.phone, current.role);
    this.storeSession(rotated);
    return rotated;
  }

  async logout(user: { sub: string; role: UserRole }): Promise<void> {
    const userKey = this.getUserKey(user.sub, user.role);
    const refreshToken = this.activeRefreshTokenByUser.get(userKey);
    if (!refreshToken) {
      return;
    }

    const session = this.refreshSessions.get(refreshToken);
    if (session) {
      this.revokeSession(session);
    }
  }

  resolveAccessToken(authorizationHeader?: string): {
    sub: string;
    phone: string;
    role: UserRole;
  } {
    const token = authorizationHeader?.replace(/^Bearer\s+/i, '').trim();
    const session = token ? this.accessSessions.get(token) : undefined;
    if (!session) {
      throw new UnauthorizedException({
        code: 'ACCESS_TOKEN_INVALID',
        message: 'Access token is invalid',
      });
    }

    return {
      sub: session.user.id,
      phone: session.user.phone,
      role: session.role,
    };
  }

  private createSession(phone: string, role: UserRole): SessionRecord {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return {
      accessToken: `access-${nonce}`,
      refreshToken: `refresh-${nonce}`,
      role,
      user: {
        id: 'user-1',
        phone,
        name: null,
        preferredLanguage: 'ru',
        preferredCurrency: 'KZT',
      },
    };
  }

  private storeSession(session: SessionRecord): void {
    this.accessSessions.set(session.accessToken, session);
    this.refreshSessions.set(session.refreshToken, session);
    this.activeRefreshTokenByUser.set(
      this.getUserKey(session.user.id, session.role),
      session.refreshToken,
    );
  }

  private revokeSession(session: SessionRecord): void {
    this.accessSessions.delete(session.accessToken);
    this.refreshSessions.delete(session.refreshToken);
    this.activeRefreshTokenByUser.delete(
      this.getUserKey(session.user.id, session.role),
    );
  }

  private getUserKey(userId: string, role: UserRole): string {
    return `${userId}:${role}`;
  }
}

describe('AuthController integration', () => {
  let app: INestApplication;
  let authService: AuthServiceDouble;

  beforeAll(async () => {
    authService = new AuthServiceDouble();

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue(new AllowThrottlerGuard())
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext): boolean => {
          const request = context.switchToHttp().getRequest();
          request.user = authService.resolveAccessToken(
            request.headers.authorization,
          );
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    configureHttpApplication(app, {
      apiPrefix: 'api/v1',
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/send-otp returns ttl', async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+77010000000' })
      .expect(201);

    expect(response.body.expiresInSeconds).toBeDefined();
  });

  it('POST /auth/verify-otp returns access and refresh tokens', async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/verify-otp')
      .send({
        phone: '+77010000000',
        code: '1234',
        role: UserRole.CLIENT,
      })
      .expect(201);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.user.phone).toBe('+77010000000');
  });

  it('POST /auth/refresh rotates refresh token', async () => {
    const verifyResponse = await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/verify-otp')
      .send({
        phone: '+77010000000',
        code: '1234',
        role: UserRole.CLIENT,
      })
      .expect(201);

    const response = await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken: verifyResponse.body.refreshToken,
      })
      .expect(201);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.refreshToken).not.toBe(
      verifyResponse.body.refreshToken,
    );
  });

  it('POST /auth/logout invalidates refresh token', async () => {
    const verifyResponse = await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/verify-otp')
      .send({
        phone: '+77010000000',
        code: '1234',
        role: UserRole.CLIENT,
      })
      .expect(201);

    await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${verifyResponse.body.accessToken}`)
      .expect(201);

    await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken: verifyResponse.body.refreshToken,
      })
      .expect(401);
  });
});
