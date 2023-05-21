import { Pool, Protocol, ReportStatus } from 'src/common/enums';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './Transaction.service';
import { anything, instance, mock, reset, verify, when } from 'ts-mockito';
import { HttpService } from '@nestjs/axios';
import { IExchangeRateProvider } from 'src/exchange-rate/providers/IExchangeRate.provider';
import { ITransactionProvider } from '../providers/ITransaction.provider';

import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect, Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bull';
import { Transaction, TransactionSchema } from '../models/Transaction.model';
import {
  TransactionReport,
  TransactionReportSchema,
} from '../models/TransactionReport.model';
import { QueueModule } from 'src/common/modules/Queue.module';
import { ExchangeRateService } from 'src/exchange-rate/services/ExchangeRate.service';
import { EtherscanProvider } from '../providers/Etherscan.provider';
import { BinanceProvider } from 'src/exchange-rate/providers/Binance.provider';
import { mongoSnapshotIgnoreFields, sanitizeDocuments } from 'src/utils/tests';
import { REPORTS_QUEUE } from 'src/common/constants';
import { BullModule } from '@nestjs/bull';
import * as dayjs from 'dayjs';
import {
  RecordInterval,
  RecordIntervalSchema,
} from '../models/RecordInterval.model';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('TransactionService', () => {
  let service: TransactionService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let transactionModel: Model<Transaction>;
  let reportModel: Model<TransactionReport>;
  let intervalModel: Model<RecordInterval>;
  let transactionProviderMock = mock(EtherscanProvider);
  let exchangeRateProviderMock = mock(BinanceProvider);

  const mockQueue: any = {
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
  };

  beforeAll(async () => {
    // mock database
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;
    transactionModel = mongoConnection.model(
      Transaction.name,
      TransactionSchema,
    );
    reportModel = mongoConnection.model(
      TransactionReport.name,
      TransactionReportSchema,
    );
    intervalModel = mongoConnection.model(
      RecordInterval.name,
      RecordIntervalSchema,
    );

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        BullModule.registerQueue({
          name: REPORTS_QUEUE,
        }),
      ],
      providers: [
        TransactionService,
        ExchangeRateService,
        {
          provide: getModelToken(Transaction.name),
          useValue: transactionModel,
        },
        {
          provide: getModelToken(TransactionReport.name),
          useValue: reportModel,
        },
        {
          provide: getModelToken(RecordInterval.name),
          useValue: intervalModel,
        },
        {
          provide: HttpService,
          useValue: instance(mock(HttpService)),
        },
        {
          provide: ITransactionProvider,
          useValue: instance(transactionProviderMock),
        },
        {
          provide: IExchangeRateProvider,
          useValue: instance(exchangeRateProviderMock),
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    })
      // mock queue
      .overrideProvider(getQueueToken(REPORTS_QUEUE))
      .useValue(mockQueue)
      .compile();

    service = module.get<TransactionService>(TransactionService);
  });

  beforeEach(async () => {
    when(transactionProviderMock.getTransactions(anything())).thenResolve([
      {
        id: '0x1',
        timestamp: 1,
        blockNumber: 1,
        fee: '22921930374619520',
      },
      {
        id: '0x2',
        timestamp: 2,
        blockNumber: 2,
        fee: '14691703394596320',
      },
      {
        id: '0x3',
        timestamp: 5,
        blockNumber: 3,
        fee: '14691703394596320',
      },
    ]);

    when(exchangeRateProviderMock.getHistoricalRates(anything()))
      .thenResolve([
        { timestamp: 1, value: '1800' },
        { timestamp: 2, value: '1801' },
        { timestamp: 3, value: '1802' },
      ])
      .thenResolve([
        { timestamp: 4, value: '1803' },
        { timestamp: 5, value: '2004' },
        { timestamp: 6, value: '1805' },
      ]);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    const collections = mongoConnection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    reset(transactionProviderMock);
  });

  describe('getTransactions', () => {
    it('should return transactions for a given protocol and pool', async () => {
      // Arrange
      const protocol = Protocol.UNISWAPV3;
      const pool = Pool.ETH_USDC;
      const doc = await transactionModel.create({
        protocol,
        pool,
        hash: '0x1',
        timestamp: 1,
        blockNumber: 1,
        fee: {
          eth: '100000000000000000',
          usdt: '100',
        },
      });

      // Act
      const result = await service.getTransactionByHash('0x1', protocol, pool);

      // Assert
      expect(result).toMatchSnapshot();
    });

    it('should return null if no transaction is found', async () => {
      // Arrange
      const protocol = Protocol.UNISWAPV3;
      const pool = Pool.ETH_USDC;

      // Act
      const result = await service.getTransactionByHash('0x1', protocol, pool);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getTransactionsList', () => {
    it('should return transactions for a given protocol and pool', async () => {
      // Arrange
      const protocol = Protocol.UNISWAPV3;
      const pool = Pool.ETH_USDC;
      for (let i = 0; i < 10; i++) {
        await transactionModel.create({
          protocol,
          pool,
          hash: `0x${i}`,
          timestamp: i,
          blockNumber: i,
          fee: {
            eth: '100000000000000000',
            usdt: '100',
          },
        });
      }

      // Act
      const result = await service.getTransactionList(protocol, pool, 0, 5);

      // Assert
      expect(result).toMatchSnapshot();
    });
  });

  describe('recordNewTransactions', () => {
    it('can record new transactions', async () => {
      // Arrange
      const protocol = Protocol.UNISWAPV3;
      const pool = Pool.ETH_USDC;

      // Act
      await service.recordNewTransactions(protocol, pool);

      // Assert
      const data = await transactionModel.find({});
      const sanitizedData = sanitizeDocuments(data);
      expect(sanitizedData).toMatchSnapshot();
    });
  });
  describe('getTransactionCount', () => {
    it('should return the count of transactions for a given protocol and pool', async () => {
      // Arrange
      const protocol = Protocol.UNISWAPV3;
      const pool = Pool.ETH_USDC;
      const count = 10;

      for (let i = 0; i < count; i++) {
        await transactionModel.create({
          protocol,
          pool,
          hash: `0x${i}`,
          timestamp: 1,
          blockNumber: 1,
          fee: {
            eth: '100000000000000000',
            usdt: '100',
          },
        });
      }

      // Act
      const result = await service.getTransactionCount(protocol, pool);

      // Assert
      expect(result).toEqual(count);
    });
  });

  describe('triggerReportGeneration', () => {
    it('should create a report and add it to the queue', async () => {
      // Arrange
      const protocol = Protocol.UNISWAPV3;
      const pool = Pool.ETH_USDC;
      const startTime = new Date('2022-01-01T00:00:00.000Z');
      const endTime = new Date('2022-01-02T00:00:00.000Z');

      const result = await service.triggerReportGeneration(
        protocol,
        pool,
        startTime,
        endTime,
      );

      // Act
      const doc = await reportModel.findById(result);

      // Assert
      expect(doc.toObject()).toMatchSnapshot(mongoSnapshotIgnoreFields);
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith({ id: result });
    });
  });

  describe('getReportStatus', () => {
    it('should return the status of a report', async () => {
      const reportId = '123';
      const report = {
        status: ReportStatus.PENDING,
      };
      jest.spyOn(reportModel, 'findById').mockResolvedValueOnce(report as any);

      const result = await service.getReportStatus(reportId);

      expect(reportModel.findById).toHaveBeenCalledWith(reportId);
      expect(result).toEqual(report.status);
    });

    it('should return null if the report is not found', async () => {
      const reportId = '123';
      jest.spyOn(reportModel, 'findById').mockResolvedValueOnce(null);

      const result = await service.getReportStatus(reportId);

      expect(reportModel.findById).toHaveBeenCalledWith(reportId);
      expect(result).toBeNull();
    });
  });

  describe('processReport', () => {
    it('should update report status to COMPLETED and set total fees', async () => {
      // Arrange
      const { id } = await reportModel.create({
        protocol: Protocol.UNISWAPV3,
        pool: Pool.ETH_USDC,
        startTimestamp: dayjs('2021-01-01T00:00:00.000Z').unix(),
        endTimestamp: dayjs('2021-01-02T00:00:00.000Z').unix(),
      });

      // Act
      await service.processReport(id);

      // Assert
      const res = await reportModel.findById(id);
      const transactions = await transactionModel.find({});
      const sanitizedData = sanitizeDocuments(transactions);

      expect(res.toObject()).toMatchSnapshot(mongoSnapshotIgnoreFields);
      expect(sanitizedData).toMatchSnapshot();
    });

    it('should not process if the data is already present in database', async () => {
      // Arrange
      await intervalModel.create({
        protocol: Protocol.UNISWAPV3,
        pool: Pool.ETH_USDC,
        start: dayjs('2021-01-01T00:00:00.000Z').unix(),
        end: dayjs('2021-01-02T00:00:00.000Z').unix(),
      });

      const { id } = await reportModel.create({
        protocol: Protocol.UNISWAPV3,
        pool: Pool.ETH_USDC,
        startTimestamp: dayjs('2021-01-01T00:00:00.000Z').unix(),
        endTimestamp: dayjs('2021-01-02T00:00:00.000Z').unix(),
      });

      // Act
      await service.processReport(id);

      // Assert
      const res = await reportModel.findById(id);
      const transactions = await transactionModel.find({});
      const sanitizedData = sanitizeDocuments(transactions);

      verify(transactionProviderMock.getTransactions(anything())).never();
      expect(res.toObject()).toMatchSnapshot(mongoSnapshotIgnoreFields);
      expect(sanitizedData).toMatchSnapshot();
    });

    it('should update report status to FAILED if an error occurs', async () => {
      // Arrange
      const { id } = await reportModel.create({
        protocol: Protocol.UNISWAPV3,
        pool: Pool.ETH_USDC,
        startTimestamp: dayjs('2021-01-01T00:00:00.000Z').unix(),
        endTimestamp: dayjs('2021-01-02T00:00:00.000Z').unix(),
      });

      when(transactionProviderMock.getTransactions(anything())).thenReject(
        new Error('test error'),
      );

      // Act
      await service.processReport(id);

      // Assert
      const res = await reportModel.findById(id);
      expect(res.toObject()).toMatchSnapshot(mongoSnapshotIgnoreFields);
    });
  });

  describe('getReport', () => {
    it('should return a report', async () => {
      // Arrange
      const { id } = await reportModel.create({
        protocol: Protocol.UNISWAPV3,
        pool: Pool.ETH_USDC,
        startTimestamp: 2,
        endTimestamp: 5,
        totalFee: {
          eth: '200000000000000000',
          usdt: '200',
        },
        count: 2,
        status: ReportStatus.COMPLETED,
      });

      await transactionModel.create([
        {
          protocol: Protocol.UNISWAPV3,
          pool: Pool.ETH_USDC,
          hash: '0x1',
          timestamp: 1,
          blockNumber: 1,
          fee: {
            eth: '100000000000000000',
            usdt: '100',
          },
        },
        {
          protocol: Protocol.UNISWAPV3,
          pool: Pool.ETH_USDC,
          hash: '0x2',
          timestamp: 2,
          blockNumber: 2,
          fee: {
            eth: '100000000000000000',
            usdt: '100',
          },
        },
        {
          protocol: Protocol.UNISWAPV3,
          pool: Pool.ETH_USDC,
          hash: '0x3',
          timestamp: 3,
          blockNumber: 3,
          fee: {
            eth: '100000000000000000',
            usdt: '100',
          },
        },
      ]);
      // Act
      const result = await service.getReport(id, 0, 10);

      // Assert
      result.id = undefined;
      expect(result).toMatchSnapshot();
    });
  });
});
