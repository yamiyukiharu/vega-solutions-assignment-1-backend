import { Controller, Get, Query } from '@nestjs/common';
import { GetExchangeRateDto } from '../dtos/ExchangeRate.dto';
import { ExchangeRateService } from '../services/ExchangeRate.service';
import { Throttle } from '@nestjs/throttler';
import { ApiGetExchangeRate } from './decorators';

@Controller('v1/exchange-rate')
export class ExchangeRateController {
  constructor(private exchangeRateService: ExchangeRateService) {}

  @Get()
  @Throttle(120, 60)
  @ApiGetExchangeRate()
  async getExchangeRate(@Query() query: GetExchangeRateDto): Promise<number> {
    const { from, to } = query;
    return await this.exchangeRateService.getExchangeRate(from, to);
  }
}
