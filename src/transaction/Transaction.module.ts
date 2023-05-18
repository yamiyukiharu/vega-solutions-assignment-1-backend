import { Module } from '@nestjs/common';
import { TransactionController } from './controllers/Transaction.controller';
import { TransactionService } from './services/Transaction.service';
import { ExchangeRateService } from '../exchange-rate/services/ExchangeRate.service';
import { BullModule } from '@nestjs/bull';
import { AppConfigModule } from 'src/common/AppConfig.module';
import { ConfigService } from '@nestjs/config';
import { QueueModule } from 'src/common/Queue.module';

@Module({
  imports: [
    QueueModule,
    AppConfigModule
  ],
  controllers: [TransactionController],
  providers: [TransactionService, ExchangeRateService],
})
export class TransactionModule { }
