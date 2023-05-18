import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TransactionsReportConsumer } from './consumers/TransactionsReport.consumer';
import { TransactionService } from './services/Transaction.service';
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
    DatabaseModule,
    TypeOrmModule.forFeature([Transaction])
  ],
  providers: [TransactionsReportConsumer, TransactionService],
})
export class WorkerModule { }
