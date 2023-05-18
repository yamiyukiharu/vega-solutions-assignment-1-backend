import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsHexadecimal,
  IsOptional,
  Matches,
} from 'class-validator';
import { Pool, Protocol } from 'src/common/enums';
import {
  ApiResponse,
  ApiResponseProperty,
  OmitType,
  PickType,
} from '@nestjs/swagger';
import { Transaction } from '../models/Transaction.model';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionReport } from '../models/TransactionReport.model';

export class GetTransactionRequest {
  @Matches(/^0x([A-Fa-f0-9]+)$/, {
    message: 'Hash must be a hexadecimal string that starts with 0x',
  })
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Transaction Hash. If this is specified, page and limit parameters are ignored. Must begin with 0x',
  })
  hash: string;

  @IsEnum(Protocol)
  @ApiProperty({ enum: Protocol })
  protocol: Protocol;

  @IsEnum(Pool)
  @ApiProperty({ enum: Pool })
  pool: Pool;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @ApiPropertyOptional({ default: 0 })
  page: number = 0;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @ApiPropertyOptional({ default: 10 })
  limit: number = 10;
}

export class TransactionResult extends OmitType(Transaction, [
  '_id',
] as const) {}

export class GetTransactionResponse {
  @ApiPropertyOptional()
  page?: number;

  @ApiPropertyOptional()
  total?: number;

  @ApiPropertyOptional()
  limit?: number;

  @ApiResponseProperty({ type: [TransactionResult] })
  results: TransactionResult[];
}

export class GenerateReportRequest {
  @IsEnum(Protocol)
  @ApiProperty({ enum: Protocol })
  protocol: Protocol;

  @IsEnum(Pool)
  @ApiProperty({ enum: Pool })
  pool: Pool;

  @IsDateString()
  @ApiProperty({ description: 'Start date in ISO8601 format' })
  startTime: string;

  @IsDateString()
  @ApiProperty({ description: 'Start date in ISO8601 format' })
  endTime: string;
}

export class ReportStatusResponse extends PickType(TransactionReport, [
  'status',
] as const) {}
