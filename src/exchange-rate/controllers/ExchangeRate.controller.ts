import { Controller, Get, Query } from '@nestjs/common';
import { GetExchangeRateDto } from '../dtos/ExchangeRate.dto';
import { ExchangeRateService } from '../services/ExchangeRate.service';
import { ApiGetExchangeRate } from './decorators';

@Controller('v1/exchange-rate')
export class ExchangeRateController {
  constructor(private exchangeRateService: ExchangeRateService) {}

  @Get()
  @ApiGetExchangeRate()
  async getExchangeRate(@Query() query: GetExchangeRateDto): Promise<number> {
    const { from, to } = query;
    return await this.exchangeRateService.getExchangeRate(from, to);
  }
}
