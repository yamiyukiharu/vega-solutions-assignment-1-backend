import { Injectable } from '@nestjs/common';
import { IExchangeRateProvider } from '../providers/IExchangeRate.provider';
import { Currency } from 'src/common/enums';
import { GetHistoricalRateOptions } from '../types';

@Injectable()
export class ExchangeRateService {
  constructor(private exchangeRateProvider: IExchangeRateProvider) {}

  async getExchangeRate(from: Currency, to: Currency): Promise<number> {
    return await this.exchangeRateProvider.convert(from, to);
  }

  async getHistoricalRates(options: GetHistoricalRateOptions): Promise<any> {
    const { from, to, start, end } = options;
    return await this.exchangeRateProvider.getHistoricalRates({
      from,
      to,
      start,
      end,
    });
  }
}
