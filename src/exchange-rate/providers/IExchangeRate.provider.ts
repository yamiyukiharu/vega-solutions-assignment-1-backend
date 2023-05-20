import { Injectable } from '@nestjs/common';
import { Currency } from 'src/common/enums';
import { GetHistoricalRateOptions, HistoricalDataResult } from '../types';

@Injectable()
export abstract class IExchangeRateProvider {
  abstract convert(from: Currency, to: Currency): Promise<number>;
  abstract getHistoricalRates(
    options: GetHistoricalRateOptions,
  ): Promise<HistoricalDataResult[]>;
}
