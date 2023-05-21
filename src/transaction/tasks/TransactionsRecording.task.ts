import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { TransactionService } from '../services/Transaction.service';
import { Pool, Protocol } from 'src/common/enums';

@Injectable()
export class TransactionsRecordingTask {
  private readonly logger = new Logger(TransactionsRecordingTask.name);

  constructor(private transactionService: TransactionService) {}

  @Interval(5000) // runs every 5 seconds
  async recordNewTransactions() {
    this.logger.log(`Recording new transactions for ${Protocol.UNISWAPV3} ${Pool.ETH_USDC}...`);
    await this.transactionService.recordNewTransactions(
      Protocol.UNISWAPV3,
      Pool.ETH_USDC,
    );
    this.logger.log(`Finished recording new transactions for ${Protocol.UNISWAPV3} ${Pool.ETH_USDC}!`);
  }
}
