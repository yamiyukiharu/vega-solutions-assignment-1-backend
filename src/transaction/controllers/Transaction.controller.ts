import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
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
  GetReportStatusResponse,
  GetReportRequest,
  GetReportResponse,
} from '../dtos/transaction.dto';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiGenerateReport,
  ApiGetReport,
  ApiGetReportStatus,
  ApiGetTransactions,
} from '../services/decorators';

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
  @ApiGenerateReport()
  async generateReport(
    @Body() generateReportRequest: GenerateReportRequest,
    @Res() res: Response,
  ): Promise<GenerateReportRequest> {
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

    return res.header('Location', `v1/transactions/reports/status/${id}`).json({
      location: `v1/transactions/reports/status/${id}`,
    }) as unknown as GenerateReportRequest;
  }

  @Get('reports/status/:id')
  @Throttle(120, 60)
  @ApiGetReportStatus()
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
  @ApiGetReport()
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
