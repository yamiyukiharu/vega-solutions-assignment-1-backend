import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { Entity, Column, ObjectIdColumn, ObjectId, Index } from 'typeorm';

export class TxFee {
  @ApiProperty()
  eth: string;

  @ApiProperty()
  usdt: string;
}

export class TxPrice {
  @ApiProperty()
  eth: string;

  @ApiProperty()
  usdt: string;
}

@Entity()
export class Transaction {
  @ObjectIdColumn()
  @Exclude()
  _id: ObjectId;

  @Expose()
  @ApiProperty()
  get id(): string {
    return this._id.toHexString();
  }

  @Column()
  @Index()
  @ApiProperty()
  hash: string;

  @Column()
  @ApiProperty()
  protocol: string;

  @Column()
  @ApiProperty()
  pool: string;

  @Column('simple-json')
  @ApiProperty()
  fee: TxFee;

  @Column('simple-json')
  @ApiProperty()
  price: TxPrice;

  @Column('timestamp')
  @ApiProperty()
  timestamp: string;
}
