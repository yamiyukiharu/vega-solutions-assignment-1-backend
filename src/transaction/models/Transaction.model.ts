import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Pool, Protocol } from 'src/common/enums';

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

@Schema({ collection: 'transaction'})
export class Transaction {
  @Prop()
  _id: string;

  @Prop({unique: true, index: true})
  @ApiProperty()
  hash: string;

  @Prop()
  @ApiProperty()
  protocol: Protocol;

  @Prop()
  @ApiProperty()
  pool: Pool;

  @Prop(TxFee)
  @ApiProperty()
  fee: TxFee;

  @Prop(TxPrice)
  @ApiProperty()
  price: TxPrice;

  @Prop()
  @ApiProperty()
  timestamp: number;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);