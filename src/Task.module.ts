import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TransactionsRecordingTask } from './transaction/tasks/TransactionsRecording.task';
import { TransactionService } from './transaction/services/Transaction.service';
import { AppConfigModule } from 'src/common/modules/AppConfig.module';
import { DatabaseModule } from 'src/common/modules/Database.module';
import { ITransactionProvider } from './transaction/providers/ITransaction.provider';
import { EtherscanProvider } from './transaction/providers/Etherscan.provider';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TransactionReport,
  TransactionReportSchema,
} from './transaction/models/TransactionReport.model';
import {
  Transaction,
  TransactionSchema,
} from './transaction/models/Transaction.model';
import {
  RecordInterval,
  RecordIntervalSchema,
} from './transaction/models/RecordInterval.model';
import { QueueModule } from 'src/common/modules/Queue.module';
import { HttpModule } from '@nestjs/axios';
import { IExchangeRateProvider } from 'src/exchange-rate/providers/IExchangeRate.provider';
import { BinanceProvider } from 'src/exchange-rate/providers/Binance.provider';
import { ExchangeRateService } from './exchange-rate/services/ExchangeRate.service';
import { RedisCacheModule } from './common/modules/RedisCache.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule,
    QueueModule,
    AppConfigModule,
    DatabaseModule,
    RedisCacheModule,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    MongooseModule.forFeature([
      { name: TransactionReport.name, schema: TransactionReportSchema },
    ]),
    MongooseModule.forFeature([
      { name: RecordInterval.name, schema: RecordIntervalSchema },
    ]),
  ],
  providers: [
    TransactionService,
    ExchangeRateService,
    TransactionsRecordingTask,
    {
      provide: ITransactionProvider,
      useClass: EtherscanProvider,
    },
    {
      provide: IExchangeRateProvider,
      useClass: BinanceProvider,
    },
  ],
})
export class TaskModule {}
