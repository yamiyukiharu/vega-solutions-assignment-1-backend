import { Pool, Protocol } from 'src/common/enums';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './Transaction.service';
import { anything, instance, mock, when } from 'ts-mockito';
import { HttpService } from '@nestjs/axios';
import { IExchangeRateProvider } from 'src/exchange-rate/providers/IExchangeRate.provider';
import { ITransactionProvider } from '../providers/ITransaction.provider';

import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect, Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from '../models/Transaction.model';
import {
  TransactionReport,
  TransactionReportSchema,
} from '../models/TransactionReport.model';
import { QueueModule } from 'src/common/modules/Queue.module';
import { ExchangeRateService } from 'src/exchange-rate/services/ExchangeRate.service';
import { EtherscanProvider } from '../providers/Etherscan.provider';
import { BinanceProvider } from 'src/exchange-rate/providers/Binance.provider';
import { mongoSnapshotIgnoreFields } from 'src/utils/tests';

describe('TransactionService', () => {
  let service: TransactionService;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let transactionModel: Model<Transaction>;
  let reportModel: Model<TransactionReport>;
  let transactionProviderMock = mock(EtherscanProvider);
  let exchangeRateProviderMock = mock(BinanceProvider);

  const importQueue: any = {
    add: jest.fn(),
    process: jest.fn(),
  };

  beforeEach(async () => {
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

    const module: TestingModule = await Test.createTestingModule({
      imports: [QueueModule],
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
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);

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
  });

  it('can record new transactions', async () => {
    const protocol = Protocol.UNISWAPV3;
    const pool = Pool.ETH_USDC;
    await service.recordNewTransactions(protocol, pool);

    const data = await transactionModel.find({});
    const sanitizedData = data.map((d) => {
      return {
        ...d.toObject(),
        _id: undefined,
        __v: undefined,
      };
    });
    expect(sanitizedData).toMatchSnapshot();
  });
});
