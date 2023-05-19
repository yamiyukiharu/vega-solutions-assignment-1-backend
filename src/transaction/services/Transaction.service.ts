import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction } from '../models/Transaction.model';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { Pool, Protocol, ReportStatus } from 'src/common/enums';
import { TransactionReport } from '../models/TransactionReport.model';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ITransactionProvider } from '../providers/ITransaction.provider';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionReport)
    private reportRepo: Repository<TransactionReport>,
    @InjectQueue('transactions-report') private reportQueue: Queue,
    private uniswapV3Provider: ITransactionProvider,
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
    const report = await this.reportRepo.save({
      status: ReportStatus.PENDING,
      protocol,
      pool,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });

    const id = report._id.toString();

    await this.reportQueue.add(report);

    return id;
  }

  async updateReportStatus(id: ObjectId, status: ReportStatus) {
    await this.reportRepo.update(id, { status });
  }

  async getReportStatus(id: string): Promise<ReportStatus> {
    const report = await this.reportRepo.findOneBy({ _id: new ObjectId(id) });
    return report.status;
  }

  async recordTransactionsWithRange(
    protocol: Protocol,
    pool: Pool,
    startTime: Date,
    endTime: Date,
  ) {
    let provider: ITransactionProvider;
    switch (protocol) {
      case Protocol.UNISWAPV3:
        provider = this.uniswapV3Provider;
        break;
      default:
        throw new Error(`Protocol ${protocol} not supported`);
    }

    let page = 0;
    const limit = 100;

    while (true) {
      const data = await provider.getTransactions({
        pool,
        page,
        limit,
        startTime,
        endTime,
      });

      const modelData: Partial<Transaction>[] = data.map((item) => {
        return {
          hash: item.id,
          protocol,
          pool,
          timestamp: item.timestamp,
          fee: {
            eth: item.fee,
            usdt: item.fee,
          },
          price: {
            eth: item.swapPrice,
            usdt: item.swapPrice,
          },
        };
      });

      this.transactionRepo.save(modelData);

      if (data.length < limit - 1) {
        break;
      }
    }
  }
}
