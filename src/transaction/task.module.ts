import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TransactionsRecordingTask } from './tasks/TransactionsRecording.task';
import { TransactionService } from './services/Transaction.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [TransactionsRecordingTask, TransactionService],
})
export class TaskModule {}
