import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { TransactionService } from '../services/Transaction.service';
import { REPORTS_QUEUE } from 'src/common/constants';
import { Logger } from '@nestjs/common';

@Processor(REPORTS_QUEUE)
export class TransactionsReportConsumer {
  private readonly logger = new Logger(TransactionsReportConsumer.name);
  
  constructor(private transactionService: TransactionService) {}

  @Process()
  async createReport(job: Job<{ id: string }>) {
    this.logger.log(`processing report ${job.data.id}...`);
    await this.transactionService.processReport(job.data.id);
    this.logger.log(`finished processing report ${job.data.id}!`);
  }
}
