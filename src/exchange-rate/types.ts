import { Currency } from "src/common/enums";

export type HistoricalDataResult = {
  timestamp: number; // unix timestamp
  value: string;
};

export type GetHistoricalRateOptions = {
  from: Currency;
  to: Currency;
  limit?: number;
  startTimestamp?: number;
  endTimestamp?: number;
};