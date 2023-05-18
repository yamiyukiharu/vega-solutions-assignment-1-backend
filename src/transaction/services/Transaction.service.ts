import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction } from '../models/Transaction.model';
import { Repository } from 'typeorm';
import { Pool, Protocol } from 'src/common/enums';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
  ) {}

  async getTransactionByHash(
    hash: string,
    protocol: Protocol,
    pool: Pool,
  ): Promise<Transaction> {
    const val = await this.transactionRepo.findOneBy({ hash, protocol, pool });
    return val;
  }

  async getTransactionList(
    protocol: Protocol,
    pool: Pool,
    page: number,
    limit: number,
  ): Promise<Transaction[]> {
    const val = await this.transactionRepo.find({
      where: { protocol, pool },
      skip: page * limit,
      take: limit,
    });
    return val;
  }

  async getTransactionCount(protocol: Protocol, pool: Pool): Promise<number> {
    // @ts-ignore
    const val = await this.transactionRepo.count({ protocol, pool});
    return val;
  }
}
