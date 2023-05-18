import { Transform } from "class-transformer";
import { IsEnum, IsHexadecimal, IsOptional, Matches } from "class-validator";
import { Pool, Protocol } from "src/common/enums";
import { OmitType } from '@nestjs/swagger';
import { Transaction } from "../models/Transaction.model";


 export class GetTransactionRequest {
  @Matches(/^0x([A-Fa-f0-9]+)$/, { message: 'Hash must be a hexadecimal string that starts with 0x' })
  @IsOptional()
  hash: string;

  @IsEnum(Protocol)
  protocol: string;

  @IsEnum(Pool)
  pool: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page: number = 0;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit: number = 10;
 }

 export class TransactionResult extends OmitType(Transaction, ['_id'] as const) {}

 export class GetTransactionResponse {
  page?: number;
  total?: number;
  limit?: number;
  results: TransactionResult[];
 }