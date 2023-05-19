import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TransactionController } from '../controllers/Transaction.controller';
import { TransactionService } from '../services/Transaction.service';
import { ExchangeRateService } from '../../exchange-rate/services/ExchangeRate.service';
import { AppConfigModule } from 'src/common/modules/AppConfig.module';
import { QueueModule } from 'src/common/modules/Queue.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../models/Transaction.model';
import { TransactionReport } from '../models/TransactionReport.model';
import { ITransactionProvider } from '../providers/ITransaction.provider';
import { TheGraphUniswapV3Provider } from '../providers/TheGraphUniswapV3.provider';

@Module({
  imports: [
    HttpModule,
    QueueModule,
    AppConfigModule,
    TypeOrmModule.forFeature([Transaction]),
    TypeOrmModule.forFeature([TransactionReport]),
  ],
  controllers: [TransactionController],
  providers: [
    TransactionService,
    ExchangeRateService,
    {
      provide: ITransactionProvider,
      useClass: TheGraphUniswapV3Provider,
    },
  ],
})
export class TransactionModule {}
