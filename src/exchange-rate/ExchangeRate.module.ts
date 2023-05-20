import { Module } from '@nestjs/common';
import { ExchangeRateService } from './services/ExchangeRate.service';
import { ExchangeRateController } from './controllers/ExchangeRate.controller';
import { IExchangeRateProvider } from './providers/IExchangeRate.provider';
import { BinanceProvider } from './providers/Binance.provider';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [ExchangeRateController],
  providers: [
    ExchangeRateService,
    {
      provide: IExchangeRateProvider,
      useClass: BinanceProvider,
    },
  ],
})
export class ExchangeRateModule {}
