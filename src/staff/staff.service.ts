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
}
