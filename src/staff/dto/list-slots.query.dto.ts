import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class ListSlotsQueryDto {
  // ISO8601 completo o fecha (vamos a usar 'YYYY-MM-DD' y parsearla manual)
  @IsISO8601()
  date: string;

  @IsUUID()
  serviceId: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60)
  stepMin?: number = 15;
}
