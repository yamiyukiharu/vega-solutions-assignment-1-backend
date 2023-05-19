import { Injectable } from '@nestjs/common';
import { Transaction } from '../models/Transaction.model';
import { ObjectId } from 'mongodb';
import { Pool, Protocol, ReportStatus } from 'src/common/enums';
import { TransactionReport } from '../models/TransactionReport.model';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  GetTransactionResult,
  ITransactionProvider,
} from '../providers/ITransaction.provider';
import * as dayjs from 'dayjs';
import BigNumber from 'bignumber.js';
import { GetReportResponse } from '../dtos/transaction.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionRepo: Model<Transaction>,
    @InjectModel(TransactionReport.name)
    private reportRepo: Model<TransactionReport>,
    @InjectQueue('transactions-report') private reportQueue: Queue,
    private uniswapV3Provider: ITransactionProvider,
  ) {}

  async getTransactionByHash(
    hash: string,
    protocol: Protocol,
    pool: Pool,
  ): Promise<Transaction | null> {
    const val = await this.transactionRepo.findOne({ hash, protocol, pool });
    return val ? val.toObject() : null;
  }

  async getTransactionList(
    protocol: Protocol,
    pool: Pool,
    page: number,
    limit: number,
  ): Promise<Transaction[]> {
    const val = await this.transactionRepo
      .find({
        protocol,
        pool,
      })
      .skip(page * limit)
      .limit(limit);
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
    const { id } = await this.reportRepo.create({
      status: ReportStatus.PENDING,
      protocol,
      pool,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });

    await this.reportQueue.add({ id });

    return id;
  }

  async updateReportStatus(id: string, status: ReportStatus) {
    await this.reportRepo.findByIdAndUpdate(id, { status });
  }

  async getReportStatus(id: string): Promise<ReportStatus | null> {
    const report = await this.reportRepo.findById(id);
    return report ? report.status : null;
  }

  async getReport(
    id: string,
    page: number,
    limit: number,
  ): Promise<GetReportResponse> {
    const report = await this.reportRepo.findById(id);
    const { startTime, endTime, count, totalFee } = report;

    const startTimestamp = dayjs(startTime).unix();
    const endTimestamp = dayjs(endTime).unix();

    const transactions = await this.transactionRepo
      .find({
        timestamp: {
          $gte: startTimestamp,
          $lte: endTimestamp,
        },
      })
      .skip(page * limit)
      .limit(limit);

    // sum of all fee.eth
    return {
      page,
      limit,
      totalFee,
      total: count,
      data: transactions,
    };
  }

  async processReport(id: string) {
    const report = await this.reportRepo.findById(id);
    const { protocol, pool, startTime, endTime } = report;

    const provider = this.getProvider(protocol);

    const limit = 1000;
    let page = 0;
    let count = 0;
    let totalFeeEth = BigNumber(0);
    let totalFeeUsdt = BigNumber(0);

    while (true) {
      const data = await provider.getTransactions({
        pool,
        page,
        limit,
        startTime,
        endTime,
      });

      totalFeeEth = totalFeeEth.plus(
        data.reduce((acc, item) => acc.plus(item.fee), BigNumber(0)),
      );

      totalFeeUsdt = totalFeeUsdt.plus(
        data.reduce((acc, item) => acc.plus(item.fee), BigNumber(0)),
      );

      await this.saveTransactionsFromProvider(protocol, pool, data);

      page++;
      count += data.length;

      if (data.length < limit - 1) {
        break;
      }
    }

    await this.reportRepo.findByIdAndUpdate(id, {
      status: ReportStatus.COMPLETED,
      count,
      totalFee: {
        eth: totalFeeEth.toString(),
        usdt: totalFeeUsdt.toString(),
      },
    });
  }

  async recordNewTransactions(protocol: Protocol, pool: Pool) {
    const provider = this.getProvider(protocol);

    const savedLatestBlock = await this.transactionRepo
      .find({})
      .sort({ blockNumber: -1 })
      .limit(1);

    const limit = 1000;
    let page = 0;

    while (true) {
      const data = await provider.getTransactions({
        pool,
        page: 0,
        limit: 1000,
        startBlock: savedLatestBlock ? savedLatestBlock[0].blockNumber : 0,
      });

      await this.saveTransactionsFromProvider(protocol, pool, data);

      page++;

      if (data.length < limit - 1) {
        break;
      }
    }
  }

  private getProvider(protocol: Protocol): ITransactionProvider {
    let provider: ITransactionProvider;
    switch (protocol) {
      case Protocol.UNISWAPV3:
        provider = this.uniswapV3Provider;
        break;
      default:
        throw new Error(`Protocol ${protocol} not supported`);
    }
    return provider;
  }

  private async saveTransactionsFromProvider(
    protocol: Protocol,
    pool: Pool,
    data: GetTransactionResult[],
  ) {
    const modelData: Partial<Transaction>[] = data.map((item) => {
      return {
        hash: item.id,
        protocol,
        pool,
        timestamp: parseInt(item.timestamp),
        fee: {
          eth: item.fee,
          usdt: item.fee,
        },
        blockNumber: item.blockNumber,
      };
    });

    // Prepare the list of update operations
    const updateOperations = modelData.map((document) => ({
      updateOne: {
        filter: { hash: document.hash }, // Check for existing documents with the same hash
        update: { $set: document },
        upsert: true,
      },
    }));

    await this.transactionRepo.bulkWrite(updateOperations);
  }
}
