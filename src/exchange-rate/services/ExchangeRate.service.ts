import { Injectable } from '@nestjs/common';
import { IExchangeRateProvider } from '../providers/IExchangeRate.provider';
import { Currency } from 'src/common/enums';
import { GetHistoricalRateOptions, HistoricalDataResult } from '../types';

@Injectable()
export class ExchangeRateService {
  constructor(private exchangeRateProvider: IExchangeRateProvider) {}

  async getExchangeRate(from: Currency, to: Currency): Promise<number> {
    return await this.exchangeRateProvider.convert(from, to);
  }

  // returns data in ascending order (oldest first)
  async getHistoricalRates(
    options: GetHistoricalRateOptions,
  ): Promise<HistoricalDataResult[]> {
    const { from, to, startTimestamp, endTimestamp } = options;
    return await this.exchangeRateProvider.getHistoricalRates(options);
  }
}
