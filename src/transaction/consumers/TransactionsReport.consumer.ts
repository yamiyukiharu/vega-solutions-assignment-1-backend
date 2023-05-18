import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { TransactionReport } from '../models/TransactionReport.model';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction } from '../models/Transaction.model';
import { Repository } from 'typeorm';

@Processor('transactions-report')
export class TransactionsReportConsumer {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionReport)
    private transactionReport: Repository<TransactionReport>,
  ) {}

  @Process()
  async createReport(job: Job<TransactionReport>) {
    console.log(job.data);
  }
}
