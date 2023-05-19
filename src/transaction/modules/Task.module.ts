import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TransactionsRecordingTask } from '../tasks/TransactionsRecording.task';
import { TransactionService } from '../services/Transaction.service';
import { AppConfigModule } from 'src/common/modules/AppConfig.module';
import { DatabaseModule } from 'src/common/modules/Database.module';
import { ITransactionProvider } from '../providers/ITransaction.provider';
import { EtherscanProvider } from '../providers/Etherscan.provider';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TransactionReport,
  TransactionReportSchema,
} from '../models/TransactionReport.model';
import { Transaction, TransactionSchema } from '../models/Transaction.model';
import { QueueModule } from 'src/common/modules/Queue.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ScheduleModule.forRoot(),
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
    TransactionService,
    TransactionsRecordingTask,
    {
      provide: ITransactionProvider,
      useClass: EtherscanProvider,
    },
  ],
})
export class TaskModule {}
