import { Module } from '@nestjs/common';
import { TransactionController } from './controllers/Transaction.controller';
import { TransactionService } from './services/Transaction.service';
import { ExchangeRateService } from '../exchange-rate/services/ExchangeRate.service';
import { BullModule } from '@nestjs/bull';
import { AppConfigModule } from 'src/common/AppConfig.module';
import { ConfigService } from '@nestjs/config';
import { QueueModule } from 'src/common/Queue.module';
import { DatabaseModule } from 'src/common/Database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './models/Transaction.model';

@Module({
  imports: [
    QueueModule,
    AppConfigModule,
    TypeOrmModule.forFeature([Transaction])
  ],
  controllers: [TransactionController],
  providers: [TransactionService, ExchangeRateService],
})
export class TransactionModule { }
