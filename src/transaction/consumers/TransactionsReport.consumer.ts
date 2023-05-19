import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { TransactionReport } from '../models/TransactionReport.model';
import { TransactionService } from '../services/Transaction.service';
import { ReportStatus } from 'src/common/enums';

@Processor('transactions-report')
export class TransactionsReportConsumer {
  constructor(private transactionService: TransactionService) {}

  @Process()
  async createReport(job: Job<{ id: string }>) {
    await this.transactionService.updateReportStatus(
      job.data.id,
      ReportStatus.IN_PROGRESS,
    );

    try {
      await this.transactionService.processReport(job.data.id);
    } catch (e) {
      await this.transactionService.updateReportStatus(
        job.data.id,
        ReportStatus.FAILED,
      );
      // TODO: Log error
      console.log(e);
      throw e;
    }
  }
}
