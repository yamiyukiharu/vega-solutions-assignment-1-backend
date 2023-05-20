import { Module } from '@nestjs/common';
import { AppConfigModule } from './common/modules/AppConfig.module';
import { DatabaseModule } from './common/modules/Database.module';
import { TransactionController } from './transaction/controllers/Transaction.controller';
import { TransactionService } from './transaction/services/Transaction.service';
import { ExchangeRateService } from './exchange-rate/services/ExchangeRate.service';
import { ITransactionProvider } from './transaction/providers/ITransaction.provider';
import { TheGraphUniswapV3Provider } from './transaction/providers/TheGraphUniswapV3.provider';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TransactionReport,
  TransactionReportSchema,
} from './transaction/models/TransactionReport.model';
import { Transaction, TransactionSchema } from './transaction/models/Transaction.model';
import { HttpModule } from '@nestjs/axios';
import { QueueModule } from './common/modules/Queue.module';
import { ExchangeRateController } from './exchange-rate/controllers/ExchangeRate.controller';
import { IExchangeRateProvider } from './exchange-rate/providers/IExchangeRate.provider';
import { BinanceProvider } from './exchange-rate/providers/Binance.provider';

@Module({
  imports: [
    HttpModule,
    QueueModule,
    AppConfigModule,
    DatabaseModule,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    MongooseModule.forFeature([
      { name: TransactionReport.name, schema: TransactionReportSchema },
    ]),
  ],
  controllers: [TransactionController, ExchangeRateController],
  providers: [
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
export class AppModule {}
