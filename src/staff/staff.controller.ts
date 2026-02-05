import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Delete,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff.query.dto';
import { CreateAvailabilityRuleDto } from './dto/create-availability-rule.dto';
import { ListSlotsQueryDto } from './dto/list-slots.query.dto';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  create(@Body() dto: CreateStaffDto) {
    return this.staffService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListStaffQueryDto) {
    return this.staffService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.update(id, dto);
  }

  @Post(':id/availability')
  addAvailability(
    @Param('id') staffId: string,
    @Body() dto: CreateAvailabilityRuleDto,
  ) {
    return this.staffService.addAvailabilityRule(staffId, dto);
  }

  @Get(':id/availability')
  listAvailability(@Param('id') id: string) {
    return this.staffService.listAvailability(id);
  }

  @Delete(':id/availability/:ruleId')
  deleteAvailability(@Param('id') id: string, @Param('ruleId') ruleId: string) {
    return this.staffService.deleteAvailabilityRule(id, ruleId);
  }

  @Get(':id/slots')
  listSlots(@Param('id') id: string, @Query() query: ListSlotsQueryDto) {
    return this.staffService.listSlots(
      id,
      query.date,
      query.serviceId,
      query.stepMin ?? 15,
    );
  }
}
