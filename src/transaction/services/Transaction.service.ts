import { Injectable } from '@nestjs/common';
import { Transaction } from '../models/Transaction.model';
import { ObjectId } from 'mongodb';
import { Currency, Pool, Protocol, ReportStatus } from 'src/common/enums';
import { TransactionReport } from '../models/TransactionReport.model';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  GetTransactionResult,
  ITransactionProvider,
} from '../providers/ITransaction.provider';
import * as dayjs from 'dayjs';
import BigNumber from 'bignumber.js';
import { GetReportResponse, TransactionResult } from '../dtos/transaction.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExchangeRateService } from 'src/exchange-rate/services/ExchangeRate.service';
import { HistoricalDataResult } from 'src/exchange-rate/types';
import { REPORTS_QUEUE } from 'src/common/constants';
import { omit } from 'lodash';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionRepo: Model<Transaction>,
    @InjectModel(TransactionReport.name)
    private reportRepo: Model<TransactionReport>,
    @InjectQueue(REPORTS_QUEUE) private reportQueue: Queue,
    private uniswapV3Provider: ITransactionProvider,
    private exchangeRateService: ExchangeRateService,
  ) {}

  async getTransactionByHash(
    hash: string,
    protocol: Protocol,
    pool: Pool,
  ): Promise<TransactionResult | null> {
    const val = await this.transactionRepo.findOne({ hash, protocol, pool });
    return val ? omit(val.toObject(), ['_id']) : null;
  }

  async getTransactionList(
    protocol: Protocol,
    pool: Pool,
    page: number,
    limit: number,
  ): Promise<TransactionResult[]> {
    const val = await this.transactionRepo
      .find({
        protocol,
        pool,
      })
      .skip(page * limit)
      .limit(limit)
      .sort({ timestamp: -1 });
    return val.map((item) => omit(item.toObject(), ['_id']));
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
      startTimestamp: dayjs(startTime).unix(),
      endTimestamp: dayjs(endTime).unix(),
    });

    await this.reportQueue.add({ id });

    return id;
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
    const { startTimestamp, endTimestamp, count, totalFee } = report;

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
      data: transactions.map((item) => omit(item.toObject(), ['_id'])),
    };
  }

  async processReport(id: string) {
    const report = await this.reportRepo.findById(id);
    const { protocol, pool, startTimestamp, endTimestamp } = report;

    try {
      await this.reportRepo.findByIdAndUpdate(id, {
        status: ReportStatus.IN_PROGRESS,
      });

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
          startTimestamp,
          endTimestamp,
          sort: 'asc',
        });

        let transactions = await this.mapProviderResultToModel(
          protocol,
          pool,
          data,
        );

        transactions = await this.addFeesInUsdt(transactions);

        await this.saveTransactionsFromProvider(transactions);

        totalFeeEth = totalFeeEth.plus(
          transactions.reduce(
            (acc, item) => acc.plus(item.fee.eth),
            BigNumber(0),
          ),
        );

        totalFeeUsdt = totalFeeUsdt.plus(
          transactions.reduce(
            (acc, item) => acc.plus(item.fee.usdt),
            BigNumber(0),
          ),
        );

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
    } catch (e) {
      // TODO: Log error
      console.log(e);
      await this.reportRepo.findByIdAndUpdate(id, {
        status: ReportStatus.FAILED,
      });
    }
  }

  async recordNewTransactions(protocol: Protocol, pool: Pool) {
    const provider = this.getProvider(protocol);

    const isDbEmpty = (await this.transactionRepo.countDocuments()) === 0;

    const latestBlock = isDbEmpty
      ? await provider.getTransactions({
          pool,
          page: 0,
          limit: 1,
          sort: 'desc',
        })
      : await this.transactionRepo.find({}).sort({ blockNumber: -1 }).limit(1);

    const limit = 1000;
    let page = 0;

    while (true) {
      const data = await provider.getTransactions({
        pool,
        page: 0,
        limit: 1000,
        startBlock: latestBlock[0].blockNumber,
        sort: 'asc',
      });

      let transactions = await this.mapProviderResultToModel(
        protocol,
        pool,
        data,
      );

      transactions = await this.addFeesInUsdt(transactions);

      await this.saveTransactionsFromProvider(transactions);

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

  private async mapProviderResultToModel(
    protocol: Protocol,
    pool: Pool,
    data: GetTransactionResult[],
  ): Promise<Transaction[]> {
    return data.map((item) => {
      return {
        hash: item.id,
        protocol,
        pool,
        timestamp: item.timestamp,
        fee: {
          eth: item.fee,
          usdt: item.fee,
        },
        blockNumber: item.blockNumber,
      };
    });
  }

  private async saveTransactionsFromProvider(data: Transaction[]) {
    // Prepare the list of update operations
    const updateOperations = data.map((document) => ({
      updateOne: {
        filter: { hash: document.hash }, // Check for existing documents with the same hash
        update: { $set: document },
        upsert: true,
      },
    }));

    await this.transactionRepo.bulkWrite(updateOperations);
  }

  private async addFeesInUsdt(
    transactions: Transaction[],
  ): Promise<Transaction[]> {
    const output: Transaction[] = [];
    let rates = await this.exchangeRateService.getHistoricalRates({
      from: Currency.ETH,
      to: Currency.USDT,
      startTimestamp: transactions[0].timestamp,
    });

    for (const transaction of transactions) {
      // Find the exchange rate with the closest matching timestamp
      let rateIdx = rates.findIndex((rate) => {
        return rate.timestamp >= transaction.timestamp;
      });

      while (rateIdx === -1) {
        rates = await this.exchangeRateService.getHistoricalRates({
          from: Currency.ETH,
          to: Currency.USDT,
          startTimestamp: rates[rates.length - 1].timestamp,
        });

        rateIdx = rates.findIndex((rate) => {
          return rate.timestamp >= transaction.timestamp;
        });
      }

      const rate = rates[rateIdx].value;

      rates = rates.slice(rateIdx);

      const feeUsdt = BigNumber(transaction.fee.eth)
        .dividedBy(1e18) // Convert from wei to eth
        .multipliedBy(rate)
        .toString();

      output.push({
        ...transaction,
        fee: {
          eth: transaction.fee.eth,
          usdt: feeUsdt,
        },
      });
    }

    return output;
  }
}
