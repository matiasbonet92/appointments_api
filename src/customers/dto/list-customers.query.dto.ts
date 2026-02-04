/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListCustomersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
