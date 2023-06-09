import { Module } from '@nestjs/common';
import * as redisStore from 'cache-manager-redis-store';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { AppConfigModule } from './AppConfig.module';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: (await redisStore.redisStore({
          url: `redis://${configService.get('REDIS_HOST')}:${configService.get(
            'REDIS_PORT',
          )}`,
          ttl: 4, // issue with cache-manager version, ttl in set() does not work
        })) as any,
      }),
      isGlobal: true,
    }),
  ],
  exports: [],
})
export class RedisCacheModule {}
