import { Module } from '@nestjs/common';
import { AppConfigModule } from './AppConfig.module';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('DB_URL'),
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
