import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { ReadyModule } from './ready/ready.module';
import { CustomersModule } from './customers/customers.module';
import { ServicesModule } from './services/services.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local'],
    }),
    PrismaModule,
    HealthModule,
    ReadyModule,
    CustomersModule,
    ServicesModule,
    StaffModule,
  ],
})
export class AppModule {}
