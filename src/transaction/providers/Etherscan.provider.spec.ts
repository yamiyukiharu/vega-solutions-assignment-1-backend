import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { EtherscanProvider, EtherscanResponse } from './Etherscan.provider';
import { Pool } from 'src/common/enums';
import BigNumber from 'bignumber.js';

describe('EtherscanProvider', () => {
  let provider: EtherscanProvider;
  let httpService: HttpService;
  let configServiceGet = jest.fn();
  const mockAxiosGet = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtherscanProvider,
        {
          provide: HttpService,
          useValue: {
            axiosRef: {
              get: mockAxiosGet,
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: configServiceGet,
          },
        },
      ],
    }).compile();

    provider = module.get<EtherscanProvider>(EtherscanProvider);
    httpService = module.get<HttpService>(HttpService);
    jest.resetAllMocks();
    configServiceGet.mockReturnValue('test-api-key');
  });

  describe('getTransactions', () => {
    const mockResponse: EtherscanResponse = {
      result: [
        {
          blockNumber: '1',
          timeStamp: '1630500000',
          hash: '0x123456789',
          blockHash: '0xabcdef',
          value: '1000000000000000000',
          gasPrice: '1000000000',
          gasUsed: '21000',
        },
      ],
    };

    it('should return an array of transactions', async () => {
      mockAxiosGet.mockResolvedValueOnce({ data: mockResponse });

      const result = await provider.getTransactions({
        pool: Pool.ETH_USDC,
        page: 0,
        limit: 100,
        startBlock: 0,
        endBlock: 27025780,
        sort: 'asc',
      });

      expect(result).toEqual([
        {
          id: '0x123456789',
          timestamp: 1630500000,
          blockNumber: 1,
          fee: '21000000000000',
        },
      ]);
    });

    it('should throw an error if pool is not supported', async () => {
      await expect(
        provider.getTransactions({
          pool: 'invalid-pool' as Pool,
          page: 0,
          limit: 100,
          startBlock: 0,
          endBlock: 27025780,
          sort: 'asc',
        }),
      ).rejects.toThrow('Pool not supported');
    });

    it('should use the correct contract address for ETH_USDC pool', async () => {
      const getPoolAddressSpy = jest
        .spyOn(provider, 'getPoolAddress')
        .mockReturnValueOnce('0x123');
      mockAxiosGet.mockResolvedValueOnce({ data: mockResponse });

      await provider.getTransactions({
        pool: Pool.ETH_USDC,
        page: 0,
        limit: 100,
        startBlock: 0,
        endBlock: 27025780,
        sort: 'asc',
      });

      expect(getPoolAddressSpy).toHaveBeenCalledWith(Pool.ETH_USDC);
      expect(mockAxiosGet.mock.calls[0]).toMatchSnapshot();
    });

    it('should use the correct API key', async () => {
      mockAxiosGet.mockResolvedValueOnce({ data: mockResponse });

      await provider.getTransactions({
        pool: Pool.ETH_USDC,
        page: 0,
        limit: 100,
        startBlock: 0,
        endBlock: 27025780,
        sort: 'asc',
      });

      expect(mockAxiosGet.mock.calls[0]).toMatchSnapshot();
    });

    it('should calculate the correct fee', async () => {
      mockAxiosGet.mockResolvedValueOnce({ data: mockResponse });

      const result = await provider.getTransactions({
        pool: Pool.ETH_USDC,
        page: 0,
        limit: 100,
        startBlock: 0,
        endBlock: 27025780,
        sort: 'asc',
      });

      expect(result[0].fee).toEqual(new BigNumber('21000000000000').toString());
    });
  });
});
