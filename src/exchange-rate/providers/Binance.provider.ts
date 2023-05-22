import { Injectable } from '@nestjs/common';
import { IExchangeRateProvider } from './IExchangeRate.provider';
import { HttpService } from '@nestjs/axios';
import { GetHistoricalRateOptions, HistoricalDataResult } from '../types';
import { retryOnFail } from 'src/utils/retry';
import { Currency } from 'src/common/enums';

@Injectable()
export class BinanceProvider extends IExchangeRateProvider {
  private readonly url = 'https://data.binance.com';

  constructor(private readonly httpService: HttpService) {
    super();
  }

  private getPairSymbol(from: Currency, to: Currency): string {
    return `${from.toUpperCase()}${to.toUpperCase()}`;
  }

  async convert(from: Currency, to: Currency): Promise<number> {
    const symbol = this.getPairSymbol(from, to);

    const url = new URL(this.url);
    url.pathname = 'api/v3/ticker/price';
    url.searchParams.append('symbol', symbol);

    const response = await this.httpService.axiosRef.get(url.toString());
    return response.data.price;
  }

  async getHistoricalRates(
    options: GetHistoricalRateOptions,
  ): Promise<HistoricalDataResult[]> {
    const { from, to, startTimestamp, endTimestamp } = options;
    const symbol = this.getPairSymbol(from, to);

    const query = {
      symbol,
      interval: '1s',
      limit: '1000',
    };

    startTimestamp && (query['startTime'] = startTimestamp * 1000);
    endTimestamp && (query['endTime'] = endTimestamp * 1000);

    const url = new URL(this.url);
    url.pathname = 'api/v3/klines';
    url.search = new URLSearchParams(query).toString();

    const request = async () => {
      return await this.httpService.axiosRef.get(url.toString());
    };

    const response = await retryOnFail(request, 3);
    
    return response.data.map((item) => ({
      timestamp: parseInt(item[0]) / 1000,
      value: item[4], // lowest price
    }));
  }
}
