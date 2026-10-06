import { UserRole } from '@dos/shared-types';
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AdminController } from '../../src/modules/admin/admin.controller';
import { AdminService } from '../../src/modules/admin/admin.service';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';
import { ExecutorsController } from '../../src/modules/executors/executors.controller';
import { ExecutorsService } from '../../src/modules/executors/executors.service';
import { UsersController } from '../../src/modules/users/users.controller';
import { UsersService } from '../../src/modules/users/users.service';
import { configureHttpApplication } from '../../src/shared/http/configure-http-app';

class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      sub: 'user-1',
      phone: '+77010000000',
      role: UserRole.ADMIN,
    };
    return true;
  }
}

describe('Profiles integration', () => {
  let app: INestApplication;

  const usersServiceMock = {
    getProfile: jest.fn(async () => ({
      id: 'user-1',
      phone: '+77010000000',
      name: 'Aruzhan',
      email: null,
      preferredLanguage: 'ru',
      preferredCurrency: 'KZT',
    })),
    updateProfile: jest.fn(async (_userId: string, dto: Record<string, unknown>) => ({
      id: 'user-1',
      phone: '+77010000000',
      name: (dto.name as string | undefined) ?? 'Aruzhan',
      email: (dto.email as string | null | undefined) ?? null,
      preferredLanguage:
        (dto.preferredLanguage as string | undefined) ?? 'ru',
      preferredCurrency: 'KZT',
    })),
  };

  const executorsServiceMock = {
    getProfile: jest.fn(async () => ({
      id: 'executor-1',
      userId: 'user-1',
      executorType: 'driver',
      vehicleType: null,
      carClass: 'economy',
      isOnline: false,
      verificationStatus: 'pending',
      user: {
        id: 'user-1',
        phone: '+77010000000',
        preferredLanguage: 'ru',
        preferredCurrency: 'KZT',
      },
      city: null,
    })),
    updateStatus: jest.fn(
      async (_userId: string, dto: Record<string, unknown>) => ({
        id: 'executor-1',
        userId: 'user-1',
        executorType: 'driver',
        vehicleType: null,
        carClass: 'economy',
        isOnline: dto.isOnline,
        verificationStatus: 'pending',
        user: {
          id: 'user-1',
          phone: '+77010000000',
          preferredLanguage: 'ru',
          preferredCurrency: 'KZT',
        },
        city: null,
      }),
    ),
    uploadDocument: jest.fn(async () => ({
      id: 'document-1',
      executorId: 'executor-1',
      documentType: 'driver_license',
      fileName: 'driver-license.png',
      fileUrl: 'https://files.local/doc.png',
    })),
  };

  const adminServiceMock = {
    verifyExecutor: jest.fn(async () => ({
      id: 'executor-1',
      userId: 'user-1',
      executorType: 'driver',
      vehicleType: null,
      carClass: 'economy',
      isOnline: false,
      verificationStatus: 'verified',
      user: {
        id: 'user-1',
        phone: '+77010000000',
        preferredLanguage: 'ru',
        preferredCurrency: 'KZT',
      },
      city: null,
    })),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController, ExecutorsController, AdminController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: ExecutorsService,
          useValue: executorsServiceMock,
        },
        {
          provide: AdminService,
          useValue: adminServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(new AuthenticatedGuard())
      .overrideGuard(RolesGuard)
      .useValue(new AuthenticatedGuard())
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

  it('GET /profile returns current user profile', async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/profile')
      .expect(200);

    expect(response.body.id).toBe('user-1');
  });

  it('PATCH /executor/status persists online state', async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .patch('/api/v1/executor/status')
      .send({
        isOnline: true,
        lat: 43.238949,
        lng: 76.889709,
      })
      .expect(200);

    expect(response.body.id).toBe('executor-1');
    expect(response.body.isOnline).toBe(true);
  });

  it('PATCH /admin/executors/:id/verify verifies executor', async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .patch('/api/v1/admin/executors/executor-1/verify')
      .send({})
      .expect(200);

    expect(response.body.verificationStatus).toBe('verified');
  });

  it('POST /executor/documents uploads executor document metadata', async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/executor/documents')
      .field('documentType', 'driver_license')
      .attach('file', Buffer.from('driver-license'), 'driver-license.png')
      .expect(201);

    expect(response.body.documentType).toBe('driver_license');
    expect(response.body.fileUrl).toBe('https://files.local/doc.png');
  });
});
