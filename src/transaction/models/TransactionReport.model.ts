import { ApiProperty } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { Pool, Protocol, ReportStatus } from "src/common/enums";
import { Column, Entity, ObjectId, ObjectIdColumn } from "typeorm";

@Entity()
export class TransactionReport {
  @ObjectIdColumn()
  @Exclude()
  _id: ObjectId;

  // expose id instead of _id so as not to leak implementation details
  @Expose()
  @ApiProperty()
  get id(): string {
    return this._id.toHexString();
  }

  @Column()
  @ApiProperty({enum: ReportStatus})
  status: ReportStatus;

  @Column()
  @ApiProperty()
  protocol: Protocol;

  @Column()
  @ApiProperty()
  pool: Pool;

  @Column()
  @ApiProperty({description: 'Start date in ISO8601 format'})
  startTime: string;

  @Column()
  @ApiProperty({description: 'Start date in ISO8601 format'})
  endTime: string;
}