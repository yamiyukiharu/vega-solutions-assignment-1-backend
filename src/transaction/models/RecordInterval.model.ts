import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Pool, Protocol } from "src/common/enums";

@Schema({ collection: "record_interval"})
export class RecordInterval {
  @Prop()
  start: number;

  @Prop()
  end: number;

  @Prop()
  pool: Pool;

  @Prop()
  protocol: Protocol;
}

export const RecordIntervalSchema = SchemaFactory.createForClass(
  RecordInterval
);