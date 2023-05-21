import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionController } from './Transaction.controller';
import { TransactionService } from '../services/Transaction.service';
import {
  GenerateReportRequest,
} from '../dtos/transaction.dto';
import {
  INestApplication,
} from '@nestjs/common';
import { Pool, Protocol, ReportStatus } from 'src/common/enums';

describe('TransactionController', () => {
  let app: INestApplication;
  let controller: TransactionController;
  let serviceMock = {
    getTransactionList: jest.fn(),
    getTransactionCount: jest.fn(),
    getTransactionByHash: jest.fn(),
    triggerReportGeneration: jest.fn(),
    getReportStatus: jest.fn(),
    getReport: jest.fn(),
  };

  beforeEach(async () => {
    // Create a new testing module with the TransactionController and a mocked TransactionService
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        {
          provide: TransactionService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    // Get the TransactionController instance and the mocked TransactionService instance
    controller = module.get<TransactionController>(TransactionController);

    app = module.createNestApplication();
    await app.init();
  });

  describe('getTransactions', () => {
    it('should return a list of transactions', async () => {
      // Arrange
      const transactions = [{ id: 1 }, { id: 2 }];
      serviceMock.getTransactionList.mockResolvedValue(transactions);
      serviceMock.getTransactionCount.mockResolvedValue(transactions.length);

      const protocol = Protocol.UNISWAPV3;
      const pool = Pool.ETH_USDC;
      const page = 1;
      const limit = 10;

      // Act
      const result = await request(app.getHttpServer())
        .get(
          `/v1/transactions?protocol=${Protocol.UNISWAPV3}&pool=${Pool.ETH_USDC}&page=${page}&limit=${limit}`,
        )
        .expect(200);

      // Assert
      expect(serviceMock.getTransactionList).toHaveBeenCalled();

      expect(result.body).toMatchSnapshot();
    });

    it('should return a single transaction when a hash is provided', async () => {
      // Arrange
      const transaction = { id: '0x1234' };
      serviceMock.getTransactionByHash.mockResolvedValue(transaction);
      serviceMock.getTransactionCount.mockResolvedValue(1);

      const protocol = Protocol.UNISWAPV3;
      const pool = Pool.ETH_USDC;

      // Act
      const result = await request(app.getHttpServer())
        .get(
          `/v1/transactions?protocol=${Protocol.UNISWAPV3}&pool=${Pool.ETH_USDC}&hash=${transaction.id}`,
        )
        .expect(200);

      // Assert
      expect(serviceMock.getTransactionByHash).toBeCalled();

      expect(result.body).toMatchSnapshot();
    });

    it('should throw a NotFoundException when a hash is provided but no transaction is found', async () => {
      // Arrange
      const transaction = { id: '0x1234' };
      serviceMock.getTransactionByHash.mockResolvedValue(null);
      serviceMock.getTransactionCount.mockResolvedValue(1);

      const protocol = Protocol.UNISWAPV3;
      const pool = Pool.ETH_USDC;

      // Act
      const result = await request(app.getHttpServer())
        .get(
          `/v1/transactions?protocol=${Protocol.UNISWAPV3}&pool=${Pool.ETH_USDC}&hash=${transaction.id}`,
        )
        .expect(404);

      // Assert
      expect(serviceMock.getTransactionByHash).toBeCalled();

      expect(result.body).toMatchSnapshot();
    });
  });

  describe('generateReport', () => {
    it('should trigger report generation and return a Location header', async () => {
      // Arrange
      const reportId = 'report-id';
      serviceMock.triggerReportGeneration.mockResolvedValue(reportId);

      const body: GenerateReportRequest = {
        protocol: Protocol.UNISWAPV3,
        pool: Pool.ETH_USDC,
        startTime: '2022-01-01T00:00:00.000Z',
        endTime: '2022-01-02T00:00:00.000Z',
      };

      // Act
      const result = await request(app.getHttpServer())
        .post(`/v1/transactions/reports`)
        .send(body)
        .expect(202);

      // Assert
      expect(serviceMock.triggerReportGeneration).toHaveBeenCalled();
      expect(result.header.location).toMatchSnapshot();
      expect(result.body).toMatchSnapshot();
    });

    it('should throw an HttpException when report generation fails', async () => {
      // Arrange
      serviceMock.triggerReportGeneration.mockResolvedValue(null);

      const body: GenerateReportRequest = {
        protocol: Protocol.UNISWAPV3,
        pool: Pool.ETH_USDC,
        startTime: '2022-01-01T00:00:00.000Z',
        endTime: '2022-01-02T00:00:00.000Z',
      };

      // Act
      const result = await request(app.getHttpServer())
        .post(`/v1/transactions/reports`)
        .send(body)
        .expect(500);

      // Assert
      expect(serviceMock.triggerReportGeneration).toHaveBeenCalled();
      expect(result.body).toMatchSnapshot();
    });
  });

  describe('getReportStatus', () => {
    it('should return the status of a report', async () => {
      // Mock the TransactionService's getReportStatus method to return a report status
      const reportStatus = 'completed';
      const reportId = 'report-id';
      serviceMock.getReportStatus.mockResolvedValue(reportStatus);

      // Act
      const result = await request(app.getHttpServer())
        .get(`/v1/transactions/reports/status/${reportId}`)
        .expect(200);

      // Assert
      expect(serviceMock.getReportStatus).toHaveBeenCalled();
      expect(result.body).toEqual({
        status: reportStatus,
      });
    });

    it('should throw a NotFoundException when no report is found', async () => {
      // Mock the TransactionService's getReportStatus method to return a report status
      const reportId = 'report-id';
      serviceMock.getReportStatus.mockResolvedValue(null);

      // Act
      const result = await request(app.getHttpServer())
        .get(`/v1/transactions/reports/status/${reportId}`)
        .expect(404);

      // Assert
      expect(serviceMock.getReportStatus).toHaveBeenCalled();
      expect(result.body).toMatchSnapshot();
    });
  });

  describe('getReport', () => {
    it('should return a report', async () => {
      // Arrange
      const reportId = 'report-id';
      const report = {
        id: 'report-id',
        protocol: Protocol.UNISWAPV3,
        pool: Pool.ETH_USDC,
        startTimestamp: 16023123123,
        endTimestamp: 16023193123,
        status: ReportStatus.COMPLETED,
        transactions: [
          {
            hash: '0x1234',
            timestamp: 16023123123,
            fee: '1234',
          },
          {
            hash: '0x1235',
            timestamp: 16023123129,
            fee: '1234',
          },
        ],
        total: 2,
        totalFee: {
          eth: '10000000',
          usdt: '12.02',
        },
      };
      serviceMock.getReport.mockResolvedValue(report);

      // Act
      const result = await request(app.getHttpServer())
        .get(`/v1/transactions/reports/${reportId}`)
        .expect(200);

      // Assert
      expect(serviceMock.getReportStatus).toHaveBeenCalled();
      expect(result.body).toEqual(report);
    });

    it('should throw a NotFoundException when no report is found', async () => {
      // Arrange
      serviceMock.getReport.mockResolvedValue(null);

      // Act
      const result = await request(app.getHttpServer())
        .get(`/v1/transactions/reports/report-id`)
        .expect(404);

      // Assert
      expect(serviceMock.getReportStatus).toHaveBeenCalled();
      expect(result.body).toMatchSnapshot();
    });
  });
});
