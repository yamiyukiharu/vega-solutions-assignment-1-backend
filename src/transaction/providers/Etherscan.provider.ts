import { Injectable } from '@nestjs/common';
import {
  GetTransactionOptions,
  GetTransactionResult,
  ITransactionProvider,
} from './ITransaction.provider';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'src/common/enums';
import BigNumber from 'bignumber.js';

export type EtherscanResponse = {
  result: {
    blockNumber: string;
    timeStamp: string;
    hash: string;
    blockHash: string;
    value: string;
    gasPrice: string;
    gasUsed: string;
  }[];
};

@Injectable()
export class EtherscanProvider extends ITransactionProvider {
  private url = 'https://api.etherscan.io/api';
  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService,
  ) {
    super();
  }

  private getContractAddress(pool: Pool): string {
    switch (pool) {
      case Pool.ETH_USDC:
        return '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
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
      startBlock = 0,
      endBlock = 27025780,
      sort = 'asc',
    } = options;

    const offset = page * limit;
    const address = this.getPoolAddress(pool);
    const contractAddress = this.getContractAddress(pool);

    let url = new URL(this.url);
    url.search = new URLSearchParams({
      module: "account",
      action: "tokentx",
      address: address,
      contractAddress: contractAddress,
      page: offset.toString(),
      offset: limit.toString(),
      startblock: startBlock.toString(),
      endblock: endBlock.toString(),
      apiKey: this.configService.get<string>('ETHERSCAN_API_KEY'),
      sort: sort,
    }).toString();

    const { data } = await this.httpService.axiosRef.get<EtherscanResponse>(
      url.toString(),
    );

    console.log(url.toString());

    return data.result.map((tx) => ({
      id: tx.hash,
      timestamp: tx.timeStamp,
      blockNumber: parseInt(tx.blockNumber),
      fee: new BigNumber(tx.gasPrice).multipliedBy(tx.gasUsed).toString(),
    }));
  }
}
