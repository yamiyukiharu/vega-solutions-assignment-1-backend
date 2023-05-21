import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { IExchangeRateProvider } from '../providers/IExchangeRate.provider';
import { Currency } from 'src/common/enums';
import { GetHistoricalRateOptions, HistoricalDataResult } from '../types';

@Injectable()
export class ExchangeRateService {
  constructor(
    private exchangeRateProvider: IExchangeRateProvider,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  private readonly CACHE_TTL = 4000;

  async getExchangeRate(from: Currency, to: Currency): Promise<number> {
    const val = await this.cacheManager.get<number>(`${from}_${to}`);

    if (val) {
      return val;
    }

    const rate = await this.exchangeRateProvider.convert(from, to);

    await this.cacheManager.set(`${from}_${to}`, rate, this.CACHE_TTL);

    return rate;
  }

  // returns data in ascending order (oldest first)
  async getHistoricalRates(
    options: GetHistoricalRateOptions,
  ): Promise<HistoricalDataResult[]> {
    const { from, to, startTimestamp, endTimestamp } = options;
    return await this.exchangeRateProvider.getHistoricalRates(options);
  }
}
