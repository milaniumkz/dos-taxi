import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RedisStoreService } from '../../shared/cache/redis-store.service';
import { AuthModule } from '../auth/auth.module';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrdersModule } from '../orders/orders.module';
import { UserEntity } from '../users/entities/user.entity';

import { PaymentCardEntity } from './entities/payment-card.entity';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { DevStubPaymentProvider } from './providers/dev-stub-payment.provider';

@Module({
  imports: [
    AuthModule,
    OrdersModule,
    TypeOrmModule.forFeature([
      PaymentEntity,
      PaymentCardEntity,
      OrderEntity,
      UserEntity,
    ]),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    DevStubPaymentProvider,
    RedisStoreService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
