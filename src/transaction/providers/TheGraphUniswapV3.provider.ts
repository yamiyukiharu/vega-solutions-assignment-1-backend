import { HttpService } from '@nestjs/axios';
import {
  GetTransactionOptions,
  GetTransactionResult,
  ITransactionProvider,
} from './ITransaction.provider';
import { Pool } from 'src/common/enums';
import { Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';
import BigNumber from 'bignumber.js';

export type TheGraphResponse = {
  data: {
    swaps: {
      amount0: string;
      amount1: string;
      transaction: {
        id: string;
        blockNumber: string;
        gasUsed: string;
        gasPrice: string;
        timestamp: string;
      };
    }[];
  };
};

@Injectable()
export class TheGraphUniswapV3Provider extends ITransactionProvider {
  private url = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';
  constructor(private readonly httpService: HttpService) {
    super();
  }

  private getPoolAddress(pool: Pool): string {
    switch (pool) {
      case Pool.ETH_USDC:
        return '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640';
      default:
        throw new Error('Pool not supported');
    }
  }

  async getTransactions(
    options: GetTransactionOptions,
  ): Promise<GetTransactionResult[]> {
    const {
      pool,
      page = 0,
      limit = 100,
      startTime,
      endTime,
      blockNumber,
    } = options;

    const skip = page * limit;
    const poolAddress = this.getPoolAddress(pool);
    const startTimestamp = dayjs(startTime).unix();
    const endTimestamp = dayjs(endTime).unix();

    const whereClause =
      startTime && endTime
        ? `where: { pool: "${poolAddress}", timestamp_gte: "${startTimestamp}", timestamp_lte: "${endTimestamp}" }`
        : `where: { pool: "${poolAddress}" }`;

    const blockNumberClause = blockNumber
      ? `block: { number: ${blockNumber} }`
      : '';

    const query = `
    query {
      swaps(
        first: ${limit},
        skip: ${skip},
        orderBy: timestamp,
        orderDirection: desc,
        ${whereClause},
        ${blockNumberClause}
      ) {
        amount0
        amount1
        transaction {
          id
          blockNumber
          gasUsed
          gasPrice
          timestamp
        }
      }
    }
    `;

    const response = await this.httpService.axiosRef.post<TheGraphResponse>(
      this.url,
      { query },
    );

    const {
      data: { swaps },
    } = response.data;

    return swaps.map((swap) => {
      const {
        amount0,
        amount1,
        transaction: { id, blockNumber, gasUsed, gasPrice, timestamp },
      } = swap;

      return {
        id,
        timestamp,
        blockNumber: parseInt(blockNumber),
        fee: BigNumber(gasUsed).multipliedBy(gasPrice).toString(),
        swapPrice: BigNumber(amount0)
          .dividedBy(amount1)
          .absoluteValue()
          .toString(),
      };
    });
  }
}