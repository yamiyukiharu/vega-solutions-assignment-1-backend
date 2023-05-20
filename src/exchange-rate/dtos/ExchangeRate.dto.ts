import { IsEnum } from "class-validator";
import { Currency } from "src/common/enums";

export class GetExchangeRateDto {
  @IsEnum(Currency)
  from: Currency;

  @IsEnum(Currency)
  to: Currency;
}