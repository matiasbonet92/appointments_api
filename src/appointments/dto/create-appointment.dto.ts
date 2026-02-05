import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  staffId: string;

  @IsUUID()
  serviceId: string;

  // ISO string: '2026-02-01T13:30:00.000Z'
  @IsString()
  startAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
