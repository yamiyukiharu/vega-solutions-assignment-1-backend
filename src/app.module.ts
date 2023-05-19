import { Module } from '@nestjs/common';
import { TransactionModule } from './transaction/modules/Transaction.module';
import { ExchangeRateModule } from './exchange-rate/ExchangeRate.module';
import { AppConfigModule } from './common/modules/AppConfig.module';
import { DatabaseModule } from './common/modules/Database.module';

@Module({
  imports: [
    AppConfigModule,
    TransactionModule,
    ExchangeRateModule,
    DatabaseModule,
  ],
})
export class AppModule { }
