import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { BinanceProvider } from './Binance.provider';
import { GetHistoricalRateOptions } from '../types';
import { AxiosResponse } from 'axios';
import { of } from 'rxjs';
import { Currency } from 'src/common/enums';

describe('BinanceProvider', () => {
  let provider: BinanceProvider;
  const mockAxiosGet = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BinanceProvider,
        {
          provide: HttpService,
          useValue: {
            axiosRef: {
              get: mockAxiosGet,
            },
          },
        },
      ],
    }).compile();

    provider = module.get<BinanceProvider>(BinanceProvider);
  });

  describe('convert', () => {
    it('should return the exchange rate between two currencies', async () => {
      const from = Currency.ETH;
      const to = Currency.USDT;
      const symbol = 'ETHUSDT';
      const price = 50000;

      mockAxiosGet.mockResolvedValue({
        data: {
          price,
        },
      });

      const result = await provider.convert(from, to);

      expect(mockAxiosGet.mock.calls[0]).toMatchSnapshot();
    });
  });

  describe('getHistoricalRates', () => {
    it('should return historical exchange rates between two currencies', async () => {
      const from = Currency.ETH;
      const to = Currency.USDT;
      const symbol = 'ETHUSDT';
      const startTimestamp = 1614556800; // March 1, 2021 12:00:00 AM GMT
      const endTimestamp = 1614643199; // March 1, 2021 11:59:59 PM GMT
      const data = [
        [
          1614556800000,
          '47000.00000000',
          '48000.00000000',
          '46000.00000000',
          '47000.00000000',
          '1000.00000000',
          1614556859999,
          '47000000.00000000',
          500,
          '500.00000000',
          '100000000.00000000',
          '0',
        ],
        [
          1614556860000,
          '48000.00000000',
          '49000.00000000',
          '47000.00000000',
          '48000.00000000',
          '2000.00000000',
          1614556919999,
          '96000000.00000000',
          1000,
          '1000.00000000',
          '100000000.00000000',
          '0',
        ],
        [
          1614556920000,
          '48000.00000000',
          '49000.00000000',
          '47000.00000000',
          '48000.00000000',
          '3000.00000000',
          1614556979999,
          '144000000.00000000',
          1500,
          '1500.00000000',
          '100000000.00000000',
          '0',
        ],
      ];

      mockAxiosGet.mockResolvedValue({
        data,
      });

      const result = await provider.getHistoricalRates({
        from,
        to,
        startTimestamp,
        endTimestamp,
      });

      expect(result).toEqual([
        {
          timestamp: 1614556800,
          value: '47000.00000000',
        },
        {
          timestamp: 1614556860,
          value: '48000.00000000',
        },
        {
          timestamp: 1614556920,
          value: '48000.00000000',
        },
      ]);
      
      expect(mockAxiosGet.mock.calls[0]).toMatchSnapshot();

    });
  });
});
