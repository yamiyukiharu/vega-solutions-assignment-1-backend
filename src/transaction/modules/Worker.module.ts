import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TransactionsReportConsumer } from '../consumers/TransactionsReport.consumer';
import { TransactionService } from '../services/Transaction.service';
import { AppConfigModule } from 'src/common/modules/AppConfig.module';
import { QueueModule } from 'src/common/modules/Queue.module';
import { DatabaseModule } from 'src/common/modules/Database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../models/Transaction.model';
import { TransactionReport } from '../models/TransactionReport.model';
import { ITransactionProvider } from '../providers/ITransaction.provider';
import { TheGraphUniswapV3Provider } from '../providers/TheGraphUniswapV3.provider';

@Module({
  imports: [
    HttpModule,
    QueueModule,
    AppConfigModule,
    DatabaseModule,
    TypeOrmModule.forFeature([Transaction]),
    TypeOrmModule.forFeature([TransactionReport]),
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
