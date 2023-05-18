import { Exclude, Expose } from 'class-transformer';
import { Entity, Column, ObjectIdColumn, ObjectId, Index } from 'typeorm';


export type TxFee = {
  eth: string;
  usdt: string;
}

export type TxPrice = {
  eth: string;
  usdt: string;
}

@Entity()
export class Transaction {
  @ObjectIdColumn()
  @Exclude()
  _id: ObjectId;

  @Expose()
  get id(): string {
    return this._id.toHexString();
  }

  @Column()
  @Index()
  hash: string;

  @Column()
  protocol: string;

  @Column()
  pool: string;

  @Column('simple-json')
  fee: TxFee;

  @Column('simple-json')
  price: TxPrice;

  @Column('timestamp')
  timestamp: string
}