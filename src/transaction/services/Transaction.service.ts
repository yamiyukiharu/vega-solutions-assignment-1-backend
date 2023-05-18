import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction } from '../models/Transaction.model';
import { Repository } from 'typeorm';

@Injectable()
export class TransactionService {
  constructor(@InjectRepository(Transaction) private transactionRepo: Repository<Transaction>) { }

  async getTransactionByHash(hash: string, protocol: string, pool: string): Promise<Transaction> {

    const val = await this.transactionRepo.findOneBy({ hash, protocol, pool })
    return val
  }

  // async getTransactionList(page: number, limit: number, protocol)
}
