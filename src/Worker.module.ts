import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TransactionsReportConsumer } from './transaction/consumers/TransactionsReport.consumer';
import { TransactionService } from './transaction/services/Transaction.service';
import { AppConfigModule } from 'src/common/modules/AppConfig.module';
import { QueueModule } from 'src/common/modules/Queue.module';
import { DatabaseModule } from 'src/common/modules/Database.module';
import { ITransactionProvider } from './transaction/providers/ITransaction.provider';
import { TheGraphUniswapV3Provider } from './transaction/providers/TheGraphUniswapV3.provider';
import { MongooseModule } from '@nestjs/mongoose';
import { IExchangeRateProvider } from 'src/exchange-rate/providers/IExchangeRate.provider';
import { BinanceProvider } from 'src/exchange-rate/providers/Binance.provider';
import { ExchangeRateService } from 'src/exchange-rate/services/ExchangeRate.service';
import {
  Transaction,
  TransactionSchema,
} from './transaction/models/Transaction.model';
import {
  TransactionReport,
  TransactionReportSchema,
} from './transaction/models/TransactionReport.model';
import {
  RecordInterval,
  RecordIntervalSchema,
} from './transaction/models/RecordInterval.model';
import { RedisCacheModule } from './common/modules/RedisCache.module';


@Module({
  imports: [
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
    TransactionsReportConsumer,
    TransactionService,
    ExchangeRateService,
    {
      provide: ITransactionProvider,
      useClass: TheGraphUniswapV3Provider,
    },
    {
      provide: IExchangeRateProvider,
      useClass: BinanceProvider,
    },
  ],
})
export class WorkerModule {}
