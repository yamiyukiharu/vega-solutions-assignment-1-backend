import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeRateController } from './ExchangeRate.controller';
import { ExchangeRateService } from '../services/ExchangeRate.service';
import { GetExchangeRateDto } from '../dtos/ExchangeRate.dto';
import { Currency } from 'src/common/enums';

describe('ExchangeRateController', () => {
  let controller: ExchangeRateController;
  const mockService = {
    getExchangeRate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExchangeRateController],
      providers: [
        {
          provide: ExchangeRateService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ExchangeRateController>(ExchangeRateController);
  });

  describe('getExchangeRate', () => {
    it('should return the exchange rate between two currencies', async () => {
      const from = Currency.ETH;
      const to = Currency.USDT;
      const exchangeRate = 0.85;
      const query: GetExchangeRateDto = { from, to };
      mockService.getExchangeRate.mockResolvedValue(exchangeRate);

      const result = await controller.getExchangeRate(query);

      expect(result).toBe(exchangeRate);
      expect(mockService.getExchangeRate).toHaveBeenCalledWith(from, to);
    });
  });
});
