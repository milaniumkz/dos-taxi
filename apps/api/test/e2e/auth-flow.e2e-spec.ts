import { UserRole } from '@dos/shared-types';
import request from 'supertest';

import {
  createPlatformE2EHarness,
  E2EHarness,
} from './support/platform-harness';

describe('AUTH_FLOW e2e', () => {
  let harness: E2EHarness;

  beforeAll(async () => {
    harness = await createPlatformE2EHarness();
  });

  afterAll(async () => {
    await harness.close();
  });

  it('covers send_otp -> wrong_code_3times -> lockout -> correct_code -> refresh_token -> logout', async () => {
    const kzPhone = '+77010000031';
    const ruPhone = '+79991234567';

    await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/send-otp')
      .send({ phone: kzPhone })
      .expect(201);

    await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/verify-otp')
      .send({
        phone: kzPhone,
        code: '0000',
        role: UserRole.CLIENT,
      })
      .expect(401);

    await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/verify-otp')
      .send({
        phone: kzPhone,
        code: '1111',
        role: UserRole.CLIENT,
      })
      .expect(401);

    await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/verify-otp')
      .send({
        phone: kzPhone,
        code: '2222',
        role: UserRole.CLIENT,
      })
      .expect(429)
      .expect((response) => {
        expect(response.body.code).toBe('OTP_LOCKED');
      });

    await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/verify-otp')
      .send({
        phone: kzPhone,
        code: '1234',
        role: UserRole.CLIENT,
      })
      .expect(429);

    await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/send-otp')
      .send({ phone: kzPhone })
      .expect(201);

    const verifyResponse = await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/verify-otp')
      .send({
        phone: kzPhone,
        code: '1234',
        role: UserRole.CLIENT,
      })
      .expect(201);

    await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/send-otp')
      .send({ phone: ruPhone })
      .expect(201);

    await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/verify-otp')
      .send({
        phone: ruPhone,
        code: '1234',
        role: UserRole.CLIENT,
      })
      .expect(201);

    const refreshResponse = await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken: verifyResponse.body.refreshToken,
      })
      .expect(201);

    await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
      .expect(201)
      .expect({
        success: true,
      });

    await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken: refreshResponse.body.refreshToken,
      })
      .expect(401);
  });
});
