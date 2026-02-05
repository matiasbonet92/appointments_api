import { IsString, IsOptional, MaxLength } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsString()
  startAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
