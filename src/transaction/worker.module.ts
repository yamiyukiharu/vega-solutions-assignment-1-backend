import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TransactionsReportConsumer } from './consumers/TransactionsReport.consumer';
import { TransactionService } from './services/Transaction.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'transactions-report',
      redis: {
        host: 'localhost',
        port: 55001,
        username: 'default',
        password: 'redispw',
      },
    }),
  ],
  providers: [TransactionsReportConsumer, TransactionService],
})
export class WorkerModule {}
