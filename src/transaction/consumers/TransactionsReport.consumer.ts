import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { TransactionReport } from '../models/TransactionReport.model';
import { TransactionService } from '../services/Transaction.service';
import { ReportStatus } from 'src/common/enums';

@Processor('transactions-report')
export class TransactionsReportConsumer {
  constructor(private transactionService: TransactionService) {}

  @Process()
  async createReport(job: Job<TransactionReport>) {
    
    await this.transactionService.updateReportStatus(
      job.data._id,
      ReportStatus.IN_PROGRESS,
    );

    const { protocol, pool, startTime, endTime } = job.data;

    try {
      await this.transactionService.recordTransactionsWithRange(
        protocol,
        pool,
        new Date(startTime),
        new Date(endTime),
      );
    } catch (e) {
      await this.transactionService.updateReportStatus(
        job.data._id,
        ReportStatus.FAILED,
      );
      // TODO: Log error
      throw e;
    }

    await this.transactionService.updateReportStatus(
      job.data._id,
      ReportStatus.COMPLETED,
    );
  }
}
