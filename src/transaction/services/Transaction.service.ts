import { Injectable, Logger } from '@nestjs/common';
import { Transaction } from '../models/Transaction.model';
import { Currency, Pool, Protocol, ReportStatus } from 'src/common/enums';
import { TransactionReport } from '../models/TransactionReport.model';
import { Queue } from 'bull';
import {
  GetTransactionResult,
  ITransactionProvider,
} from '../providers/ITransaction.provider';
import * as dayjs from 'dayjs';
import BigNumber from 'bignumber.js';
import { GetReportResponse, TransactionResult } from '../dtos/transaction.dto';
import { Model } from 'mongoose';
import { ExchangeRateService } from 'src/exchange-rate/services/ExchangeRate.service';
import { omit } from 'lodash';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { REPORTS_QUEUE } from 'src/common/constants';
import { RecordInterval } from '../models/RecordInterval.model';
import { start } from 'repl';
import e from 'express';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private readonly MAX_RECORDS_PER_INTERVAL = 1000;

  constructor(
    @InjectModel(Transaction.name)
    private transactionRepo: Model<Transaction>,
    @InjectModel(TransactionReport.name)
    private reportRepo: Model<TransactionReport>,
    @InjectQueue(REPORTS_QUEUE) private reportQueue: Queue,
    @InjectModel(RecordInterval.name)
    private intervalRepo: Model<RecordInterval>,
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

  // newest transactions first
  async getTransactionList(
    protocol: Protocol,
    pool: Pool,
    page: number,
    limit: number,
  ): Promise<TransactionResult[]> {
    // get the latest interval
    const latestInterval = (await this.intervalRepo
      .findOne()
      .sort({ end: -1 })) || {
      start: dayjs().unix(),
      end: dayjs().unix(),
    };

    let transactions = await this.retrieveTransactionsBetween(
      protocol,
      pool,
      latestInterval.start,
      latestInterval.end,
      page,
      limit,
    );

    if (transactions.length == limit) {
      return transactions;
    }

    // if the latest interval transaction count is less than limit,
    // we need to fetch new data
    await this.saveTransactionsFromProvider({
      protocol,
      pool,
      page,
      limit: limit + 50, // fetch more data to make sure we have enough
      sort: 'desc',
    });

    return (
      await this.transactionRepo
        .find({
          protocol,
          pool,
        })
        .skip(page * limit)
        .limit(limit)
        .sort({ timestamp: -1 })
    ).map((item) => omit(item.toObject(), ['_id']));
  }

  async getTransactionCount(protocol: Protocol, pool: Pool): Promise<number> {
    const val = await this.transactionRepo.count({ protocol, pool });
    return val;
  }

  async triggerReportGeneration(
    protocol: Protocol,
    pool: Pool,
    startTime: Date,
    endTime: Date,
  ): Promise<string> {
    const report = await this.reportRepo.create({
      status: ReportStatus.PENDING,
      protocol,
      pool,
      startTimestamp: dayjs(startTime).unix(),
      endTimestamp: dayjs(endTime).unix(),
    });

    const { id } = report;
    await this.reportQueue.add({ id });

    this.logger.log(`Report ${id} is added to queue`, report.toObject());

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
    const {
      startTimestamp,
      endTimestamp,
      count,
      totalFee,
      protocol,
      pool,
      status,
    } = report;

    const transactions = await this.retrieveTransactionsBetween(
      protocol,
      pool,
      startTimestamp,
      endTimestamp,
      page,
      limit,
    );

    return {
      id,
      status: report.status,
      protocol,
      pool,
      startTimestamp,
      endTimestamp,
      page,
      limit,
      totalFee,
      total: count,
      data: transactions,
    };
  }

  async processReport(id: string) {
    const report = await this.reportRepo.findById(id);
    const { protocol, pool, startTimestamp, endTimestamp } = report;

    try {
      // update status to in progress
      await this.reportRepo.findByIdAndUpdate(id, {
        status: ReportStatus.IN_PROGRESS,
      });

      // check if data is already in DB
      const dataInDb = await this.dataIntervalExists(
        protocol,
        pool,
        startTimestamp,
        endTimestamp,
      );

      if (dataInDb) {
        this.logger.log(`Data is already in DB, skip getting data from API`);

        const count = await this.transactionRepo.count({
          timestamp: {
            $gte: startTimestamp,
            $lte: endTimestamp,
          },
        });

        const transactions = await this.transactionRepo.find({
          timestamp: {
            $gte: startTimestamp,
            $lte: endTimestamp,
          },
        });

        await this.reportRepo.findByIdAndUpdate(id, {
          status: ReportStatus.COMPLETED,
          count,
          totalFee: this.calculateTotalFees(transactions),
        });
      } else {
        let count = 0;
        let totalFeeEth = BigNumber(0);
        let totalFeeUsdt = BigNumber(0);
        let start = startTimestamp;

        while (true) {
          const transactions = await this.saveTransactionsFromProvider({
            protocol,
            pool,
            startTimestamp: start,
            endTimestamp,
          });

          const { eth, usdt } = this.calculateTotalFees(transactions);

          totalFeeEth = totalFeeEth.plus(eth);

          totalFeeUsdt = totalFeeUsdt.plus(usdt);

          count += transactions.length;
          start = transactions[transactions.length - 1].timestamp;

          // means this is the last page of the results
          if (transactions.length < this.MAX_RECORDS_PER_INTERVAL - 1) {
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
    } catch (e) {
      this.logger.error(e);
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
      : await this.transactionRepo.find({}).sort({ timestamp: -1 }).limit(1);

    while (true) {
      const transactions = await this.saveTransactionsFromProvider({
        protocol,
        pool,
        startBlock: latestBlock[0].blockNumber,
      });

      if (transactions.length < this.MAX_RECORDS_PER_INTERVAL - 1) {
        break;
      }
    }
  }

  private async retrieveTransactionsBetween(
    protocol: Protocol,
    pool: Pool,
    startTimestamp: number,
    endTimestamp: number,
    page: number,
    limit: number,
  ): Promise<Transaction[]> {
    const transactions = await this.transactionRepo
      .find({
        protocol,
        pool,
        timestamp: {
          $gte: startTimestamp,
          $lte: endTimestamp,
        },
      })
      .skip(page * limit)
      .limit(limit)
      .sort({ timestamp: -1 });

    return transactions.map((item) => omit(item.toObject(), ['_id']));
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

  private async bulkUpsertToDb(data: Transaction[]): Promise<number> {
    // Prepare the list of update operations
    const updateOperations = data.map((document) => ({
      updateOne: {
        filter: { hash: document.hash }, // Check for existing documents with the same hash
        update: { $set: document },
        upsert: true,
      },
    }));

    const { upsertedCount } = await this.transactionRepo.bulkWrite(
      updateOperations,
    );

    return upsertedCount;
  }

  // Looks for the closest matching exchange rate for each transaction
  // and adds the fee in USDT
  // transactions must be in ascending order
  private async addFeesInUsdt(
    transactions: Transaction[],
  ): Promise<Transaction[]> {
    const output: Transaction[] = [];
    let rates = await this.exchangeRateService.getHistoricalRates({
      from: Currency.ETH,
      to: Currency.USDT,
      startTimestamp: transactions[0].timestamp,
      limit: transactions.length,
    });

    for (const transaction of transactions) {
      let rateIdx = rates.findIndex((rate) => {
        // Find the exchange rate with the closest matching timestamp (5 seconds)
        // return Math.abs(rate.timestamp - transaction.timestamp) < 5;
        return rate.timestamp >= transaction.timestamp;
      });

      while (rateIdx === -1) {
        rates = await this.exchangeRateService.getHistoricalRates({
          from: Currency.ETH,
          to: Currency.USDT,
          startTimestamp: rates[rates.length - 1].timestamp,
          limit: transactions.length,
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

  // transactions are returned in ascending order
  async saveTransactionsFromProvider(options: {
    protocol: Protocol;
    pool: Pool;
    limit?: number;
    page?: number;
    sort?: 'asc' | 'desc';
    startBlock?: number;
    endBlock?: number;
    startTimestamp?: number;
    endTimestamp?: number;
  }): Promise<Transaction[]> {
    const {
      protocol,
      pool,
      page,
      limit,
      sort,
      startBlock,
      endBlock,
      startTimestamp,
      endTimestamp,
    } = options;

    const provider = this.getProvider(protocol);

    const data = await provider.getTransactions({
      pool,
      page: page || 0,
      limit: limit || this.MAX_RECORDS_PER_INTERVAL,
      startBlock,
      endBlock,
      startTimestamp,
      endTimestamp,
      sort: sort || 'asc',
    });

    this.logger.log(
      `Found ${data.length} recent transactions for ${protocol} ${pool}`,
    );

    let transactions = await this.mapProviderResultToModel(
      protocol,
      pool,
      data,
    );

    this.logger.log(
      `Calculating fees in usdt on new transactions for ${protocol} ${pool}`,
    );

    // addFeesInUsdt requires the transactions to be in ascending order
    if (sort === 'desc') transactions = transactions.reverse();

    transactions = await this.addFeesInUsdt(transactions);

    const newTxCount = await this.bulkUpsertToDb(transactions);

    this.logger.log(
      `Saving ${newTxCount} new transactions for ${protocol} ${pool}`,
    );

    await this.mergeRecordIntervals(
      protocol,
      pool,
      transactions[0].timestamp,
      transactions[transactions.length - 1].timestamp,
    );

    return transactions;
  }

  private calculateTotalFees(transactions: Transaction[]) {
    const totalFeeEth = transactions.reduce(
      (acc, item) => acc.plus(item.fee.eth),
      BigNumber(0),
    );

    const totalFeeUsdt = transactions.reduce(
      (acc, item) => acc.plus(item.fee.usdt),
      BigNumber(0),
    );

    return {
      eth: totalFeeEth.toString(),
      usdt: totalFeeUsdt.toString(),
    };
  }

  private async dataIntervalExists(
    protocol: Protocol,
    pool: Pool,
    start: number,
    end: number,
  ): Promise<boolean> {
    const allIntervals = await this.intervalRepo.find({
      protocol,
      pool,
    });

    return (
      allIntervals.findIndex(
        (item) => item.start <= start && item.end >= end,
      ) !== -1
    );
  }

  private async mergeRecordIntervals(
    protocol: Protocol,
    pool: Pool,
    start: number,
    end: number,
  ): Promise<void> {
    let left = [];
    let right = [];

    const intervals = await this.intervalRepo.find({
      protocol,
      pool,
    });

    this.logger.log(
      `Merging intervals for ${protocol} ${pool} with ${intervals.length} records`,
    );

    for (const interval of intervals) {
      const { start: first, end: last } = interval;

      // current interval is smaller than newInterval
      if (last < start) left.push(interval);
      // current interval is larger than newInterval
      else if (first > end) right.push(interval);
      // there is a overlap
      else {
        start = Math.min(start, first);
        end = Math.max(end, last);
      }
    }

    const merged = [...left, { start, end, protocol, pool }, ...right];

    await this.intervalRepo.deleteMany({ protocol, pool });
    await this.intervalRepo.insertMany(merged);
  }
}
