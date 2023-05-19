import { Pool } from 'src/common/enums';

export type GetTransactionOptions = {
  pool: Pool;
  page?: number;
  limit?: number;
  startTime?: Date;
  endTime?: Date;
  blockNumber?: number;
};

export type GetTransactionResult = {
  id: string;
  timestamp: string;
  blockNumber: number;
  fee: string; // in gwei
  swapPrice: string; // token1/token2
};

export abstract class ITransactionProvider {
  abstract getTransactions(
    options: GetTransactionOptions,
  ): Promise<GetTransactionResult[]>;
}
