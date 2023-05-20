import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { TransactionService } from '../services/Transaction.service';
import { Pool, Protocol } from 'src/common/enums';

@Injectable()
export class TransactionsRecordingTask {
  constructor(private transactionService: TransactionService) {}

  @Interval(5000) // runs every 5 seconds
  async recordNewTransactions() {
    console.log('recording new transactions...');
    await this.transactionService.recordNewTransactions(
      Protocol.UNISWAPV3,
      Pool.ETH_USDC,
    );
    console.log('finished!');
  }
}
