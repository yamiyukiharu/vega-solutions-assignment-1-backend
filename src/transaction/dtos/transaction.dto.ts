import { Transform } from 'class-transformer';
import { IsEnum, IsHexadecimal, IsOptional, Matches } from 'class-validator';
import { Pool, Protocol } from 'src/common/enums';
import { ApiResponse, ApiResponseProperty, OmitType } from '@nestjs/swagger';
import { Transaction } from '../models/Transaction.model';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  protocol: string;

  @IsEnum(Pool)
  @ApiProperty({ enum: Pool })
  pool: string;

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
