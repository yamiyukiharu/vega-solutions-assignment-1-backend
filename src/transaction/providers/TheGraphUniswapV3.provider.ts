import { HttpService } from '@nestjs/axios';
import {
  GetTransactionOptions,
  GetTransactionResult,
  ITransactionProvider,
} from './ITransaction.provider';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { retryOnFail } from 'src/utils/retry';

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
  private readonly url =
    'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

  constructor(private readonly httpService: HttpService) {
    super();
  }

  async getTransactions(
    options: GetTransactionOptions,
  ): Promise<GetTransactionResult[]> {
    const {
      pool,
      page = 0,
      limit = 100,
      startTimestamp,
      endTimestamp,
      sort = 'asc',
    } = options;

    const skip = page * limit;
    const poolAddress = this.getPoolAddress(pool);

    const whereClause =
      startTimestamp && endTimestamp
        ? `where: { pool: "${poolAddress}", timestamp_gte: "${startTimestamp}", timestamp_lte: "${endTimestamp}" }`
        : `where: { pool: "${poolAddress}" }`;

    const query = `
    query {
      swaps(
        first: ${limit},
        skip: ${skip},
        orderBy: timestamp,
        orderDirection: ${sort},
        ${whereClause},
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

    const request = async () => {
      return await this.httpService.axiosRef.post<TheGraphResponse>(
        this.url,
        { query },
      );
    }

    const response  = await retryOnFail(request, 3);

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
        timestamp: parseInt(timestamp),
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
