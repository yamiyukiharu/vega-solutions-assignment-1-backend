import { Pool } from 'src/common/enums';

export type GetTransactionOptions = {
  pool: Pool;
  page?: number;
  limit?: number;
  startTimestamp?: number;
  endTimestamp?: number;
  startBlock?: number;
  endBlock?: number;
  sort?: 'asc' | 'desc';
};

export type GetTransactionResult = {
  id: string;
  timestamp: number;
  blockNumber: number;
  fee: string; // in wei
};

export abstract class ITransactionProvider {
  getPoolAddress(pool: Pool): string {
    switch (pool) {
      case Pool.ETH_USDC:
        return '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640';
      default:
        throw new Error('Pool not supported');
    }
  }

  abstract getTransactions(
    options: GetTransactionOptions,
  ): Promise<GetTransactionResult[]>;
}
