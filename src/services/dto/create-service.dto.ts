import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsInt()
  @Min(5)
  @Max(480)
  durationMin: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000000)
  priceCents?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
