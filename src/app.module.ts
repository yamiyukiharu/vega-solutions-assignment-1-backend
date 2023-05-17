import { Module } from '@nestjs/common';
import { TransactionModule } from './transaction/Transaction.module';
import { ExchangeRateModule } from './exchange-rate/ExchangeRate.module';

@Module({
  imports: [TransactionModule, ExchangeRateModule],
})
export class AppModule {}
