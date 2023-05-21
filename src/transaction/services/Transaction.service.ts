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

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

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

    const transactions = await this.transactionRepo
      .find({
        timestamp: {
          $gte: startTimestamp,
          $lte: endTimestamp,
        },
      })
      .skip(page * limit)
      .limit(limit)
      .sort({ timestamp: -1 });

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
      data: transactions.map((item) => omit(item.toObject(), ['_id'])),
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
      const allIntervals = await this.intervalRepo.find({
        protocol,
        pool,
      });

      const dataInDb =
        allIntervals.findIndex(
          (item) => item.start <= startTimestamp && item.end >= endTimestamp,
        ) !== -1;

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

        const totalFeeEth = transactions.reduce(
          (acc, item) => acc.plus(item.fee.eth),
          BigNumber(0),
        );

        const totalFeeUsdt = transactions.reduce(
          (acc, item) => acc.plus(item.fee.usdt),
          BigNumber(0),
        );

        await this.reportRepo.findByIdAndUpdate(id, {
          status: ReportStatus.COMPLETED,
          count,
          totalFee: {
            eth: totalFeeEth,
            usdt: totalFeeUsdt,
          },
        });
      } else {
        const provider = this.getProvider(protocol);

        const limit = 1000;
        let count = 0;
        let totalFeeEth = BigNumber(0);
        let totalFeeUsdt = BigNumber(0);
        let start = startTimestamp;

        while (true) {
          const data = await provider.getTransactions({
            pool,
            page: 0,
            limit,
            startTimestamp: start,
            endTimestamp,
            sort: 'asc',
          });

          this.logger.log(
            `Got ${data.length} transactions from provider, start: ${start}, end: ${endTimestamp}`,
          );

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

          count += data.length;
          start = data[data.length - 1].timestamp;

          if (data.length < limit - 1) {
            break;
          }
        }

        // handle special case when endTimestamp is greater than current time

        await this.mergeRecordIntervals(
          protocol,
          pool,
          allIntervals,
          startTimestamp,
          endTimestamp,
        );

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
      : await this.transactionRepo.find({}).sort({ timestamp: -1 }).limit(1);

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

      transactions = await this.addFeesInUsdt(transactions);

      const newTxCount = await this.saveTransactionsFromProvider(transactions);

      this.logger.log(
        `Saving ${newTxCount} new transactions for ${protocol} ${pool}`,
      );

      const allIntervals = await this.intervalRepo.find({
        protocol,
        pool,
      });

      this.logger.log(
        `Merging intervals for ${protocol} ${pool} with ${allIntervals.length} records`,
      );

      await this.mergeRecordIntervals(
        protocol,
        pool,
        allIntervals,
        transactions[0].timestamp,
        transactions[transactions.length - 1].timestamp,
      );

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

  private async saveTransactionsFromProvider(
    data: Transaction[],
  ): Promise<number> {
    // Prepare the list of update operations
    const updateOperations = data.map((document) => ({
      updateOne: {
        filter: { hash: document.hash }, // Check for existing documents with the same hash
        update: { $set: document },
        upsert: true,
      },
    }));

    const { insertedCount } = await this.transactionRepo.bulkWrite(
      updateOperations,
    );

    return insertedCount;
  }

  // Looks for the closest matching exchange rate for each transaction
  // and adds the fee in USDT
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

  private async mergeRecordIntervals(
    protocol: Protocol,
    pool: Pool,
    intervals: RecordInterval[],
    start: number,
    end: number,
  ): Promise<void> {
    let left = [];
    let right = [];

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
