import { Controller, Get, Param, Query } from '@nestjs/common';
import { TransactionService } from '../services/Transaction.service';

export type GetTxByIdQuery = {
  protocol: string;
  pool: string;
  hash?: string;
  page?: number;
  limit?: number;
}

@Controller('v1/transaction')
export class TransactionController {
  constructor(private transactionService: TransactionService) { }

  @Get()
  async getTransactionById(@Query() query: GetTxByIdQuery) {
    const { hash, protocol, pool, page, limit } = query
    // TODO: validate inputs
    // TODO: handle pagintion
    // RESEARCH: should we use DTOs between services and controllers?
    return await this.transactionService.getTransactionByHash(hash, protocol, pool)
  }
}
