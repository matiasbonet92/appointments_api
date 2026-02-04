import { CreateStaffDto } from './create-staff.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateStaffDto extends PartialType(CreateStaffDto) {}
