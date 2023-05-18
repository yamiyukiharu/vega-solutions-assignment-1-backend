import { Module } from '@nestjs/common';
import { TransactionModule } from './transaction/Transaction.module';
import { ExchangeRateModule } from './exchange-rate/ExchangeRate.module';
import { AppConfigModule } from './common/AppConfig.module';

@Module({
  imports: [AppConfigModule, TransactionModule, ExchangeRateModule],
})
export class AppModule { }
