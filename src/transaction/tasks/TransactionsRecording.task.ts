import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class TransactionsRecordingTask {
  @Interval(5000) // runs every 5 seconds
  getNewTransactionRecords() {
    console.log('Getting new transaction records...');
  }
}
