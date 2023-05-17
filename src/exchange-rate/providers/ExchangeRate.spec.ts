import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeRateProvider } from './ExchangeRate.provider';

describe('ExchangeRate', () => {
  let provider: ExchangeRateProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExchangeRateProvider],
    }).compile();

    provider = module.get<ExchangeRateProvider>(ExchangeRateProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
