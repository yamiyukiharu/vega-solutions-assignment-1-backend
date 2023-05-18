import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TransactionsRecordingTask } from './tasks/TransactionsRecording.task';
import { TransactionService } from './services/Transaction.service';
import { AppConfigModule } from 'src/common/AppConfig.module';
import { DatabaseModule } from 'src/common/Database.module';

@Module({
  imports: [ScheduleModule.forRoot(), AppConfigModule, DatabaseModule],
  providers: [TransactionsRecordingTask, TransactionService],
})
export class TaskModule {}
