import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeRateService } from './ExchangeRate.service';
import { IExchangeRateProvider } from '../providers/IExchangeRate.provider';
import { Currency } from 'src/common/enums';
import { GetHistoricalRateOptions, HistoricalDataResult } from '../types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;
  let exchangeRateProvider: IExchangeRateProvider;
  let mockConvert = jest.fn();
  let mockGetHistoricalRates = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRateService,
        {
          provide: IExchangeRateProvider,
          useValue: {
            convert: mockConvert,
            getHistoricalRates: mockGetHistoricalRates,
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExchangeRateService>(ExchangeRateService);
    exchangeRateProvider = module.get<IExchangeRateProvider>(
      IExchangeRateProvider,
    );
  });

  describe('getExchangeRate', () => {
    it('should return the exchange rate from the provider', async () => {
      const from = Currency.ETH;
      const to = Currency.USDT;
      const expectedRate = 0.85;
      jest
        .spyOn(exchangeRateProvider, 'convert')
        .mockResolvedValue(expectedRate);

      const rate = await service.getExchangeRate(from, to);

      expect(rate).toBe(expectedRate);
      expect(exchangeRateProvider.convert).toHaveBeenCalledWith(from, to);
    });
  });

  describe('getHistoricalRates', () => {
    it('should return the historical rates from the provider', async () => {
      const from = Currency.ETH;
      const to = Currency.USDT;
      const startTimestamp = 1622505600; // June 1, 2021
      const endTimestamp = 1625097600; // June 30, 2021
      const expectedRates: HistoricalDataResult[] = [
        { timestamp: 1622505600, value: '0.82' },
        { timestamp: 1622592000, value: '0.83' },
        { timestamp: 1622678400, value: '0.84' },
        { timestamp: 1625097600, value: '0.85' },
      ];
      jest
        .spyOn(exchangeRateProvider, 'getHistoricalRates')
        .mockResolvedValue(expectedRates);

      const options: GetHistoricalRateOptions = {
        from,
        to,
        startTimestamp,
        endTimestamp,
      };
      const rates = await service.getHistoricalRates(options);

      expect(rates).toEqual(expectedRates);
      expect(exchangeRateProvider.getHistoricalRates).toHaveBeenCalledWith(
        options,
      );
    });
  });
});
