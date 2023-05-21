import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { TransactionService } from '../services/Transaction.service';
import { Pool, Protocol } from 'src/common/enums';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Queue } from 'bull';
import { RECORD_QUEUE } from 'src/common/constants';

@Processor(RECORD_QUEUE)
export class TransactionsRecordingTask {
  private readonly logger = new Logger(TransactionsRecordingTask.name);
  private readonly frequency = 10000; // 10 seconds

  constructor(
    @InjectQueue(RECORD_QUEUE) private taskQueue: Queue,
    private transactionService: TransactionService,
  ) {
    this.taskQueue.add({}, { delay: this.frequency });
  }

  @Process()
  async recordNewTransactions() {
    this.logger.log(
      `Recording new transactions for ${Protocol.UNISWAPV3} ${Pool.ETH_USDC}...`,
    );
    await this.transactionService.recordNewTransactions(
      Protocol.UNISWAPV3,
      Pool.ETH_USDC,
    );
    this.logger.log(
      `Finished recording new transactions for ${Protocol.UNISWAPV3} ${Pool.ETH_USDC}!`,
    );
    await this.taskQueue.add({}, { delay: this.frequency });
  }
}
