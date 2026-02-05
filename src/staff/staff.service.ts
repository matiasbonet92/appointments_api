/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  StaffMember as StaffModel,
  AvailabilityRule as AvailabilityModel,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff.query.dto';
import { CreateAvailabilityRuleDto } from './dto/create-availability-rule.dto';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStaffDto): Promise<StaffModel> {
    return this.prisma.staffMember.create({
      data: {
        fullName: dto.fullName.trim(),
        isActive: dto.isActive ?? true,
      },
    });
  }
  async findAll(query: ListStaffQueryDto) {
    const q = query.q?.trim();
    const where: Prisma.StaffMemberWhereInput = {};
    if (q) {
      where.fullName = { contains: q, mode: 'insensitive' };
    }

    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    const [items, total] = await Promise.all([
      this.prisma.staffMember.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.staffMember.count({ where }),
    ]);

    return {
      items,
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }
  async findOne(id: string) {
    const staff = await this.prisma.staffMember.findUnique({ where: { id } });
    if (!staff) {
      throw new NotFoundException('Staff not found!');
    }
    return staff;
  }
  async update(id: string, dto: UpdateStaffDto) {
    await this.findOne(id);
    return this.prisma.staffMember.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim(),
        isActive: dto.isActive,
      },
    });
  }

  async addAvailabilityRule(
    staffId: string,
    dto: CreateAvailabilityRuleDto,
  ): Promise<AvailabilityModel> {
    await this.findOne(staffId);

    if (dto.endMin <= dto.startMin) {
      throw new BadRequestException(
        'End Minutes must be greater than Start Minutes',
      );
    }

    const existingDate = await this.prisma.availabilityRule.findFirst({
      where: {
        staffId,
        dayOfWeek: dto.dayOfWeek,
        startMin: dto.startMin,
        endMin: dto.endMin,
      },
    });

    if (existingDate) {
      return existingDate;
    }

    return this.prisma.availabilityRule.create({
      data: {
        staffId,
        dayOfWeek: dto.dayOfWeek,
        startMin: dto.startMin,
        endMin: dto.endMin,
      },
    });
  }

  async listAvailability(staffId: string) {
    await this.findOne(staffId);

    const items = this.prisma.availabilityRule.findMany({
      where: { staffId },
      orderBy: [{ dayOfWeek: 'asc' }, { startMin: 'asc' }],
    });

    return { items };
  }

  async deleteAvailabilityRule(staffId: string, ruleId: string) {
    await this.findOne(staffId);

    const rule = await this.prisma.availabilityRule.findUnique({
      where: { id: ruleId },
    });
    if (!rule || rule.staffId !== staffId) {
      throw new NotFoundException('Availability rule not found');
    }

    await this.prisma.availabilityRule.delete({ where: { id: ruleId } });

    return { deleted: true };
  }

  async listSlots(
    staffId: string,
    dateStr: string,
    serviceId: string,
    stepMin: number,
  ) {
    await this.findOne(staffId);

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    if (!service.isActive) {
      throw new BadRequestException('Service is not active');
    }

    // Parseamos fecha 'YYYY-MM-DD' como inicio de día local
    // (MVP: consistente con tu availability que también está en hora local)
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('date must be a valid date');
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayOfWeek = dayStart.getDay(); // 0..6

    const rules = await this.prisma.availabilityRule.findMany({
      where: { staffId, dayOfWeek },
      orderBy: [{ startMin: 'asc' }],
    });

    if (rules.length === 0) {
      return {
        date: dateStr,
        staffId,
        serviceId,
        durationMin: service.durationMin,
        stepMin,
        slots: [],
      };
    }

    const appointments = await this.prisma.appointment.findMany({
      where: {
        staffId,
        status: 'BOOKED',
        startAt: { gte: dayStart },
        endAt: { lte: dayEnd },
      },
      select: { startAt: true, endAt: true },
      orderBy: { startAt: 'asc' },
    });

    const durationMs = service.durationMin * 60_000;
    const stepMs = stepMin * 60_000;

    const slots: Array<{ startAt: string; endAt: string }> = [];

    for (const rule of rules) {
      const ruleStart = new Date(dayStart);
      ruleStart.setMinutes(rule.startMin, 0, 0);

      const ruleEnd = new Date(dayStart);
      ruleEnd.setMinutes(rule.endMin, 0, 0);

      // Generamos candidatos dentro de la regla
      for (let t = ruleStart.getTime(); t + durationMs <= ruleEnd.getTime(); t += stepMs) {
        const startAt = new Date(t);
        const endAt = new Date(t + durationMs);

        // regla simple: no cruzar medianoche (debería ser cierto dentro del mismo día)
        if (endAt.toDateString() !== startAt.toDateString()) {
          continue;
        }

        // chequeo solapamiento: existing.start < newEnd && existing.end > newStart
        const hasConflict = appointments.some((a) => a.startAt < endAt && a.endAt > startAt);
        if (hasConflict) continue;

        slots.push({
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        });
      }
    }

    return {
      date: dateStr,
      staffId,
      serviceId,
      durationMin: service.durationMin,
      stepMin,
      slots,
    };
  }
}
