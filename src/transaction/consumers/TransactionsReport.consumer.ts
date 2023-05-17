import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('transactions-report')
export class TransactionsReportConsumer {
  @Process()
  async createReport(job: Job<unknown>) {}
}
