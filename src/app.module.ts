import { Module } from '@nestjs/common';
import { TransactionModule } from './transaction/Transaction.module';
import { ExchangeRateModule } from './exchange-rate/ExchangeRate.module';
import { AppConfigModule } from './common/AppConfig.module';
import { ConfigService } from '@nestjs/config';
import { Transaction } from './transaction/models/Transaction.model';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from './common/Database.module';

@Module({
  imports: [
    AppConfigModule,
    TransactionModule,
    ExchangeRateModule,
    DatabaseModule,
  ],
})
export class AppModule { }
