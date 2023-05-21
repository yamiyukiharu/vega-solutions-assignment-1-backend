import { Module } from '@nestjs/common';
import { AppConfigModule } from './common/modules/AppConfig.module';
import { DatabaseModule } from './common/modules/Database.module';
import { TransactionController } from './transaction/controllers/Transaction.controller';
import { TransactionService } from './transaction/services/Transaction.service';
import { ExchangeRateService } from './exchange-rate/services/ExchangeRate.service';
import { ITransactionProvider } from './transaction/providers/ITransaction.provider';
import { TheGraphUniswapV3Provider } from './transaction/providers/TheGraphUniswapV3.provider';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TransactionReport,
  TransactionReportSchema,
} from './transaction/models/TransactionReport.model';
import {
  Transaction,
  TransactionSchema,
} from './transaction/models/Transaction.model';
import { HttpModule } from '@nestjs/axios';
import { QueueModule } from './common/modules/Queue.module';
import { ExchangeRateController } from './exchange-rate/controllers/ExchangeRate.controller';
import type { RedisClientOptions } from 'redis';
import * as redisStore from 'cache-manager-redis-store';
import { CacheModule } from '@nestjs/cache-manager';
import { IExchangeRateProvider } from './exchange-rate/providers/IExchangeRate.provider';
import { BinanceProvider } from './exchange-rate/providers/Binance.provider';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    HttpModule,
    QueueModule,
    AppConfigModule,
    DatabaseModule,
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
    CacheModule.registerAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: (await redisStore.redisStore({
          socket: {
            host: 'localhost', // default value
            port: 6379, // default value
          },
          ttl: 4 // issue with cache-manager version, ttl in set() does not work
        })) as any,
      }),
      isGlobal: true,
    }),
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    MongooseModule.forFeature([
      { name: TransactionReport.name, schema: TransactionReportSchema },
    ]),
  ],
  controllers: [TransactionController, ExchangeRateController],
  providers: [
    TransactionService,
    ExchangeRateService,
    {
      provide: ITransactionProvider,
      useClass: TheGraphUniswapV3Provider,
    },
    {
      provide: IExchangeRateProvider,
      useClass: BinanceProvider,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
