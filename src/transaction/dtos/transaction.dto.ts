import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, Matches, Max, Min } from 'class-validator';
import { Pool, Protocol, ReportStatus } from 'src/common/enums';
import { ApiResponseProperty, PickType } from '@nestjs/swagger';
import { TxFee } from '../models/Transaction.model';
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
  hash?: string;

  @IsEnum(Protocol)
  @ApiProperty({ enum: Protocol })
  protocol: Protocol;

  @IsEnum(Pool)
  @ApiProperty({ enum: Pool })
  pool: Pool;

  @IsOptional()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  @ApiPropertyOptional({ default: 0 })
  page?: number = 0;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({ default: 10, description: 'maximum is 100' })
  limit?: number = 10;
}

export class TransactionResult {
  @ApiProperty()
  hash: string;

  @ApiProperty()
  protocol: Protocol;

  @ApiProperty()
  pool: Pool;

  @ApiProperty()
  fee: TxFee;

  @ApiProperty()
  timestamp: number;

  @ApiProperty()
  blockNumber: number;
}

export class GetTransactionResponse {
  @ApiPropertyOptional()
  page?: number;

  @ApiPropertyOptional()
  total?: number;

  @ApiPropertyOptional()
  limit?: number;

  @ApiResponseProperty({ type: [TransactionResult] })
  data: TransactionResult[];
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

export class GetReportStatusResponse extends PickType(TransactionReport, [
  'status',
] as const) {}

export class GetReportRequest {
  @Transform(({ value }) => parseInt(value))
  page: number;

  @Transform(({ value }) => parseInt(value))
  limit: number;
}

export class GetReportResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  protocol: Protocol;

  @ApiProperty()
  pool: Pool;

  @ApiProperty({ enum: ReportStatus })
  status: ReportStatus;

  @ApiProperty({ example: '1614556800' })
  startTimestamp: number;

  @ApiProperty({ example: '1614556801' })
  endTimestamp: number;

  @ApiProperty()
  totalFee: {
    eth: string;
    usdt: string;
  };

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty({ type: TransactionResult, isArray: true })
  data: TransactionResult[];
}
