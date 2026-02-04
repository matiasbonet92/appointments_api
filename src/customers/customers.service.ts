import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers.query.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim().toLowerCase() || null,
      },
    });
  }

  async findAll(query: ListCustomersQueryDto) {
    const q = query.q?.trim();

    const where: Prisma.CustomerWhereInput | undefined = q
      ? {
          OR: [
            {
              fullName: { contains: q, mode: Prisma.QueryMode.insensitive },
            },
            { phone: { contains: q } },
            {
              email: { contains: q, mode: Prisma.QueryMode.insensitive },
            },
          ],
        }
      : undefined;

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items,
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }
}
