import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { TransactionService } from '../services/Transaction.service';
import {
  GetTransactionRequest,
  GetTransactionResponse,
} from '../dtos/transaction.dto';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

export type GetTxByIdQuery = {
  protocol: string;
  pool: string;
  hash?: string;
  page?: number;
  limit?: number;
};

@Controller('v1/transactions')
@ApiTags('transactions')
export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({
    summary: 'Get a list of transactions based on protocol and pool',
  })
  @ApiOkResponse({ type: GetTransactionResponse })
  @ApiNotFoundResponse({ description: 'Transaction with hash ${hash} not found' })
  async getTransactionById(
    @Query() getTrancsactionDto: GetTransactionRequest,
  ): Promise<GetTransactionResponse> {
    const { hash, protocol, pool, page, limit } = getTrancsactionDto;

    if (hash) {
      const tx = await this.transactionService.getTransactionByHash(
        hash,
        protocol,
        pool,
      );

      if (!tx) {
        throw new NotFoundException(`Transaction with hash ${hash} not found`);
      }

      return {
        results: [tx],
      };
    }

    const tx = await this.transactionService.getTransactionList(
      protocol,
      pool,
      page,
      limit,
    );

    const total = await this.transactionService.getTransactionCount(
      protocol,
      pool,
    );

    return {
      page,
      limit,
      total,
      results: tx,
    };
  }
}
