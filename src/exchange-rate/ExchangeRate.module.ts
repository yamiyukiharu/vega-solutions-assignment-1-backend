import { Module } from '@nestjs/common';
import { ExchangeRateService } from './services/ExchangeRate.service';
import { ExchangeRateController } from './controllers/ExchangeRate.controller';
import { IExchangeRateProvider } from './providers/IExchangeRate.provider';

@Module({
  imports: [],
  controllers: [ExchangeRateController],
  providers: [ExchangeRateService, IExchangeRateProvider],
})
export class ExchangeRateModule {}
