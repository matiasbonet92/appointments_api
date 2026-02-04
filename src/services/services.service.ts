/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { ListServicesQueryDto } from './dto/list-services.query.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        name: dto.name.trim(),
        durationMin: dto.durationMin,
        priceCents: dto.priceCents ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(query: ListServicesQueryDto) {
    const q = query.q?.trim();

    const where: any = {};

    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    const [items, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.service.count({ where }),
    ]);

    return {
      items,
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException('Service not found!');
    }
    return service;
  }
  async update(id: string, dto: UpdateServiceDto) {
    await this.findOne(id);
    return this.prisma.service.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        durationMin: dto.durationMin,
        priceCents:
          dto.priceCents === undefined ? undefined : (dto.priceCents ?? null),
        isActive: dto.isActive,
      },
    });
  }
}
