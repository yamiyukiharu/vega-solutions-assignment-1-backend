
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigModule } from './AppConfig.module';
import { REPORTS_QUEUE } from '../constants';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      imports: [AppConfigModule],
      name: REPORTS_QUEUE,
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('QUEUE_HOST'),
          port: configService.get('QUEUE_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [BullModule],
})
export class QueueModule { }
