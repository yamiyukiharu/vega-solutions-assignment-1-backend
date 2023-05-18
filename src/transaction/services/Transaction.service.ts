import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction } from '../models/Transaction.model';
import { Repository } from 'typeorm';
import { Pool, Protocol, ReportStatus } from 'src/common/enums';
import { TransactionReport } from '../models/TransactionReport.model';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionReport)
    private transactionReport: Repository<TransactionReport>,
    @InjectQueue('transactions-report') private reportQueue: Queue,
  ) {}

  async getTransactionByHash(
    hash: string,
    protocol: Protocol,
    pool: Pool,
  ): Promise<Transaction> {
    const val = await this.transactionRepo.findOneBy({ hash, protocol, pool });
    return val;
  }

  async getTransactionList(
    protocol: Protocol,
    pool: Pool,
    page: number,
    limit: number,
  ): Promise<Transaction[]> {
    const val = await this.transactionRepo.find({
      where: { protocol, pool },
      skip: page * limit,
      take: limit,
    });
    return val;
  }

  async getTransactionCount(protocol: Protocol, pool: Pool): Promise<number> {
    // @ts-ignore
    const val = await this.transactionRepo.count({ protocol, pool });
    return val;
  }

  async triggerReportGeneration(
    protocol: Protocol,
    pool: Pool,
    startTime: Date,
    endTime: Date,
  ): Promise<string> {
    const report = await this.transactionReport.save({
      status: ReportStatus.Pending,
      protocol,
      pool,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });

    const id = report._id.toString();

    await this.reportQueue.add(report);

    return id;
  }
}
