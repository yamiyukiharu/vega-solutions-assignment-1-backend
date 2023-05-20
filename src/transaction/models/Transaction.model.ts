import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { ObjectId } from 'mongoose';
import { Pool, Protocol } from 'src/common/enums';

export class TxFee {
  @ApiProperty()
  eth: string;

  @ApiProperty()
  usdt: string;
}

@Schema({ collection: 'transaction' })
export class Transaction {
  @Prop({ unique: true, index: true, required: true })
  @ApiProperty()
  hash: string;

  @Prop({ required: true })
  @ApiProperty()
  protocol: Protocol;

  @Prop({ required: true })
  @ApiProperty()
  pool: Pool;

  @Prop(TxFee)
  @Prop({ required: true })
  @ApiProperty()
  fee: TxFee;

  @Prop({ required: true })
  @ApiProperty()
  timestamp: number;

  @Prop({ required: true })
  @ApiProperty()
  blockNumber: number;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
