import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { Currency } from "src/common/enums";

export class GetExchangeRateDto {
  @IsEnum(Currency)
  @ApiProperty({ enum: Currency })
  from: Currency;

  @IsEnum(Currency)
  @ApiProperty({ enum: Currency })
  to: Currency;
}