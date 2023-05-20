import { Currency } from "src/common/enums";

export type HistoricalDataResult = {
  time: Date;
  value: string;
};

export type GetHistoricalRateOptions = {
  from: Currency;
  to: Currency;
  start?: Date;
  end?: Date;
};