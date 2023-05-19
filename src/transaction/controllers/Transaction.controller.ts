import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { TransactionService } from '../services/Transaction.service';
import {
  GenerateReportRequest,
  GetTransactionRequest,
  GetTransactionResponse,
} from '../dtos/transaction.dto';
import {
  ApiAcceptedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';

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
  @ApiNotFoundResponse({
    description: 'Transaction with hash ${hash} not found',
  })
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

  @Post('report')
  @HttpCode(HttpStatus.ACCEPTED)
  @Header('Retry-After', '5')
  // ====== Swagger decorators =======
  @ApiAcceptedResponse({ description: 'Report generation has been triggered' })
  @ApiOperation({
    summary: 'Generate a report for transactions based on protocol and pool',
  })
  @ApiHeader({
    name: 'Location',
    description: 'The endpoint to check the status of the report generation',
  })
  // =================================
  async generateReport(
    @Query() generateReportRequest: GenerateReportRequest,
    @Res() res: Response,
  ) {
    const { protocol, pool, startTime, endTime } = generateReportRequest;

    const id = await this.transactionService.triggerReportGeneration(
      protocol,
      pool,
      new Date(startTime),
      new Date(endTime),
    );

    if (!id) {
      throw new HttpException(
        'Failed to trigger report generation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return res.header('Location', `/v1/transactions/report/${id}`).json();
  }
}
