import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

export const ApiGetExchangeRate = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get the exchange rate between two currencies',
    }),
    ApiOkResponse({ type: Number }),
  );
};
