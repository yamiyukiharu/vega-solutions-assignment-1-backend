import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { TheGraphUniswapV3Provider, TheGraphResponse } from './TheGraphUniswapV3.provider';
import { GetTransactionOptions } from './ITransaction.provider';
import { Pool } from 'src/common/enums';
import BigNumber from 'bignumber.js';

describe('TheGraphUniswapV3Provider', () => {
  let provider: TheGraphUniswapV3Provider;
  let httpService: HttpService;
  const mockAxiosPost = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TheGraphUniswapV3Provider,
        {
          provide: HttpService,
          useValue: {
            axiosRef: {
              post: mockAxiosPost,
            },
          },
        },
      ],
    }).compile();

    provider = module.get<TheGraphUniswapV3Provider>(TheGraphUniswapV3Provider);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('getTransactions', () => {
    const mockResponse: TheGraphResponse = {
      data: {
        swaps: [
          {
            amount0: '100',
            amount1: '200',
            transaction: {
              id: '0x123',
              blockNumber: '123',
              gasUsed: '100000',
              gasPrice: '1000000000',
              timestamp: '1628000000',
            },
          },
        ],
      },
    };

    const mockOptions: GetTransactionOptions = {
      pool: Pool.ETH_USDC,
      page: 0,
      limit: 100,
      startTimestamp: 1628000000,
      endTimestamp: 1629000000,
      sort: 'asc',
    };

    it('should return an array of transactions', async () => {
      jest.spyOn(httpService.axiosRef, 'post').mockResolvedValueOnce({ data: mockResponse });

      const result = await provider.getTransactions(mockOptions);

      expect(mockAxiosPost.mock.calls[0]).toMatchSnapshot();

      expect(result).toEqual([
        {
          id: '0x123',
          timestamp: 1628000000,
          blockNumber: 123,
          fee: '100000000000000',
          swapPrice: '0.5',
        },
      ]);
    });
  });
});