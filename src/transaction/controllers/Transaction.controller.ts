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
  applyDecorators,
} from '@nestjs/common';
import { TransactionService } from '../services/Transaction.service';
import {
  GenerateReportRequest,
  GetTransactionRequest,
  GetTransactionResponse,
  GetReportStatusResponse,
  GetReportRequest,
  GetReportResponse,
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

export const ApiGetTransactions = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get a list of transactions based on protocol and pool',
    }),
    ApiOkResponse({ type: GetTransactionResponse }),
    ApiNotFoundResponse({
      description: 'Transaction with hash ${hash} not found',
    }),
  );
};

export const ApiGenerateReport = () => {
  return applyDecorators(
    ApiAcceptedResponse({
      description: 'Report generation has been triggered',
    }),
    ApiOperation({
      summary: 'Generate a report for transactions based on protocol and pool',
    }),
    ApiHeader({
      name: 'Location',
      description: 'The endpoint to check the status of the report generation',
    }),
  );
};

@Controller('v1/transactions')
@ApiTags('transactions')
export class TransactionController {
  constructor(private transactionService: TransactionService) {}

  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiGetTransactions()
  async getTransactions(
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
        data: [tx],
      };
    }

    const transactions = await this.transactionService.getTransactionList(
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
      data: transactions,
    };
  }

  @Post('reports')
  @HttpCode(HttpStatus.ACCEPTED)
  @Header('Retry-After', '5')
  @ApiGenerateReport()
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

    return res
      .header('Location', `/v1/transactions/reports/status/${id}`)
      .json();
  }

  @Get('reports/status/:id')
  async getReportStatus(
    @Param('id') id: string,
  ): Promise<GetReportStatusResponse> {
    const status = await this.transactionService.getReportStatus(id);

    if (!status) {
      throw new NotFoundException(`Report with id ${id} not found`);
    }

    return { status };
  }

  @Get('reports/:id')
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOkResponse({ description: 'Report generation status' })
  async getReport(
    @Param('id') id: string,
    @Query() query: GetReportRequest,
  ): Promise<GetReportResponse> {
    const { page, limit } = query;
    const report = await this.transactionService.getReport(id, page, limit);

    if (!report) {
      throw new NotFoundException(`Report with id ${id} not found`);
    }

    return report;
  }
}
