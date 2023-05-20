import { Injectable } from '@nestjs/common';
import { IExchangeRateProvider } from './IExchangeRate.provider';
import { HttpService } from '@nestjs/axios';
import * as dayjs from 'dayjs';
import { GetHistoricalRateOptions, HistoricalDataResult } from '../types';

@Injectable()
export class BinanceProvider extends IExchangeRateProvider {
  private readonly url = 'https://api.binance.com';

  constructor(private readonly httpService: HttpService) {
    super();
  }

  private getPairSymbol(from: string, to: string): string {
    return `${from.toUpperCase()}${to.toUpperCase()}`;
  }

  async convert(from: string, to: string): Promise<number> {
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
    const { from, to, start, end } = options;
    const symbol = this.getPairSymbol(from, to);

    const query = {
      symbol,
      interval: '1m',
      limit: '1000',
    };

    start && (query['startTime'] = dayjs(start).unix() * 1000);
    end && (query['endTime'] = dayjs(end).unix() * 1000);

    const url = new URL(this.url);
    url.pathname = 'api/v3/klines';
    url.search = new URLSearchParams(query).toString();

    const response = await this.httpService.axiosRef.get(url.toString());

    return response.data.map((item) => ({
      time: new Date(item[0]),
      value: item[4], // lowest price
    }));
  }
}
