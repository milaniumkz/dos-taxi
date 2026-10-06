import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { PaymentsController } from '../../src/modules/payments/payments.controller';
import { PaymentsService } from '../../src/modules/payments/payments.service';
import { configureHttpApplication } from '../../src/shared/http/configure-http-app';

describe('Payments webhook integration', () => {
  let app: INestApplication;

  const paymentsServiceMock = {
    handleWebhook: jest.fn(async () => ({
      processed: true,
      duplicated: false,
    })),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: paymentsServiceMock,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureHttpApplication(app, {
      apiPrefix: 'api/v1',
    });
    await app.init();
    app.getHttpServer = () => app.getHttpAdapter().getInstance();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /payments/webhook/:provider forwards payload to service', async () => {
    const payload = {
      eventId: 'evt-1',
      transactionId: 'txn-1',
      status: 'captured',
    };

    await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/payments/webhook/stub')
      .send(payload)
      .expect(201)
      .expect({
        processed: true,
        duplicated: false,
      });

    expect(paymentsServiceMock.handleWebhook).toHaveBeenCalledWith(
      'stub',
      payload,
    );
  });
});
