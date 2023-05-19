import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppConfigModule } from "./AppConfig.module";
import { ConfigService } from "@nestjs/config";
import { Transaction } from "src/transaction/models/Transaction.model";
import { TransactionReport } from "src/transaction/models/TransactionReport.model";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mongodb',
        url: configService.get('DB_URL'),
        entities: [Transaction, TransactionReport],
        synchronize: true,
        useNewUrlParser: true,
        logging: true,
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [TypeOrmModule]
})
export class DatabaseModule { }