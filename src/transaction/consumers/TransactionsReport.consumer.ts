import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { TransactionReport } from '../models/TransactionReport.model';
import { TransactionService } from '../services/Transaction.service';
import { ReportStatus } from 'src/common/enums';
import { REPORTS_QUEUE } from 'src/common/constants';

@Processor(REPORTS_QUEUE)
export class TransactionsReportConsumer {
  constructor(private transactionService: TransactionService) {}

  @Process()
  async createReport(job: Job<{ id: string }>) {
    console.log('processing report...');
    await this.transactionService.processReport(job.data.id);
    console.log('finished!');
  }
}
