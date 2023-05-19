import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TransactionsReportConsumer } from '../consumers/TransactionsReport.consumer';
import { TransactionService } from '../services/Transaction.service';
import { AppConfigModule } from 'src/common/modules/AppConfig.module';
import { QueueModule } from 'src/common/modules/Queue.module';
import { DatabaseModule } from 'src/common/modules/Database.module';
import { Transaction, TransactionSchema } from '../models/Transaction.model';
import {
  TransactionReport,
  TransactionReportSchema,
} from '../models/TransactionReport.model';
import { ITransactionProvider } from '../providers/ITransaction.provider';
import { TheGraphUniswapV3Provider } from '../providers/TheGraphUniswapV3.provider';
import { MongooseModule } from '@nestjs/mongoose';

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
  providers: [
    TransactionsReportConsumer,
    TransactionService,
    {
      provide: ITransactionProvider,
      useClass: TheGraphUniswapV3Provider,
    },
  ],
})
export class WorkerModule {}
