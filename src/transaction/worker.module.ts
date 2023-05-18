import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TransactionsReportConsumer } from './consumers/TransactionsReport.consumer';
import { TransactionService } from './services/Transaction.service';
import { AppConfigModule } from 'src/common/AppConfig.module';
import { ConfigService } from '@nestjs/config';
import { QueueModule } from 'src/common/Queue.module';

@Module({
  imports: [
    QueueModule,
    AppConfigModule
  ],
  providers: [TransactionsReportConsumer, TransactionService],
})
export class WorkerModule { }
