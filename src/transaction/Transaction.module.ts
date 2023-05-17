import { Module } from '@nestjs/common';
import { TransactionController } from './controllers/Transaction.controller';
import { TransactionService } from './services/Transaction.service';
import { ExchangeRateService } from '../exchange-rate/services/ExchangeRate.service';

@Module({
  imports: [],
  controllers: [TransactionController],
  providers: [TransactionService, ExchangeRateService],
})
export class TransactionModule {}
