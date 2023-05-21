import { applyDecorators } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { GetReportResponse, GetReportStatusResponse, GetTransactionResponse } from '../dtos/transaction.dto';

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
      type: GetReportStatusResponse,
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

export const ApiGetReportStatus = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get the status of the report generation',
    }),
    ApiOkResponse({ type: GetReportStatusResponse }),
    ApiNotFoundResponse(),
  );
};

export const ApiGetReport = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get the paginated transactions, and stats for the report',
    }),
    ApiOkResponse({ type: GetReportResponse }),
    ApiNotFoundResponse(),
  );
};
