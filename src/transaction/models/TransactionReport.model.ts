import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { Pool, Protocol, ReportStatus } from 'src/common/enums';
import { TxFee } from './Transaction.model';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'transaction_report' })
export class TransactionReport {
  @Prop()
  @ApiProperty({ enum: ReportStatus })
  status: ReportStatus;

  @Prop()
  @ApiProperty()
  protocol: Protocol;

  @Prop()
  @ApiProperty()
  pool: Pool;

  @Prop()
  @ApiProperty()
  startTimestamp: number;

  @Prop()
  @ApiProperty()
  endTimestamp: number;

  @Prop()
  @ApiProperty()
  totalFee: TxFee;

  @Prop()
  @ApiProperty()
  count: number;
}

export const TransactionReportSchema =
  SchemaFactory.createForClass(TransactionReport);
