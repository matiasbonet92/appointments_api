/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Appointment, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments.query.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAppointmentDto): Promise<Appointment> {
    const startAt = new Date(dto.startAt);
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('startAt must be a valid ISO date string');
    }

    const [customer, staff, service] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: dto.customerId } }),
      this.prisma.staffMember.findUnique({ where: { id: dto.staffId } }),
      this.prisma.service.findUnique({ where: { id: dto.serviceId } }),
    ]);

    if (!customer) throw new NotFoundException('Customer not found');
    if (!staff) throw new NotFoundException('Staff member not found');
    if (!service) throw new NotFoundException('Service not found');
    if (!staff.isActive) {
      throw new BadRequestException('Staff member is not active');
    }
    if (!service.isActive) {
      throw new BadRequestException('Service is not active');
    }

    const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);

    //Validar disponibilidad semanal
    await this.assertWithinAvailability(dto.staffId, startAt, endAt);

    //Anti-solapamiento
    await this.assertNoConflicts(dto.staffId, startAt, endAt);

    return this.prisma.appointment.create({
      data: {
        customerId: dto.customerId,
        staffId: dto.staffId,
        serviceId: dto.serviceId,
        status: 'BOOKED',
        startAt,
        endAt,
        notes: dto.notes?.trim() ?? null,
      },
      include: {
        customer: true,
        staff: true,
        service: true,
      },
    });
  }

  async findAll(query: ListAppointmentsQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('from/to must be valid ISO date strings');
    }
    if (to <= from) {
      throw new BadRequestException('to must be greater than from');
    }

    // opcional: validar staff exista
    const staff = await this.prisma.staffMember.findUnique({
      where: { id: query.staffId },
    });
    if (!staff) throw new NotFoundException('Staff member not found');

    const where: Prisma.AppointmentWhereInput = {
      staffId: query.staffId,
      status: 'BOOKED',
      startAt: { gte: from },
      endAt: { lte: to },
    };

    const [items, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        orderBy: { startAt: 'asc' },
        take: query.limit,
        skip: query.offset,
        include: { customer: true, service: true, staff: true },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }

  private async assertWithinAvailability(
    staffId: string,
    startAt: Date,
    endAt: Date,
  ) {
    const dayOfWeek = startAt.getDay(); // 0..6 (domingo..sábado)

    // minutos desde medianoche (en la zona horaria del server)
    const startMin = startAt.getHours() * 60 + startAt.getMinutes();
    const endMin = endAt.getHours() * 60 + endAt.getMinutes();

    // Caso simple: no soportamos turnos que cruzan de día (por ahora)
    if (endAt.toDateString() !== startAt.toDateString()) {
      throw new BadRequestException('Appointment cannot cross midnight');
    }

    const rule = await this.prisma.availabilityRule.findFirst({
      where: {
        staffId,
        dayOfWeek,
        startMin: { lte: startMin },
        endMin: { gte: endMin },
      },
    });

    if (!rule) {
      throw new BadRequestException(
        'Appointment is outside staff availability',
      );
    }
  }

  private async assertNoConflicts(staffId: string, startAt: Date, endAt: Date) {
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        staffId,
        status: 'BOOKED',
        AND: [
          { startAt: { lt: endAt } }, // existing starts before new ends
          { endAt: { gt: startAt } }, // existing ends after new starts
        ],
      },
      select: { id: true, startAt: true, endAt: true },
    });

    if (conflict) {
      throw new ConflictException({
        message: 'Time slot is already booked',
        conflict,
      });
    }
  }

  async cancel(id: string, reason?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });
    if (!appointment) throw new NotFoundException('Appointment not found!');

    if (appointment.status === 'CANCELLED') {
      return appointment;
    }

    const notes = reason ? `[CANCELLED] ${reason}` : appointment.notes;

    await this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        notes: notes ?? null,
      },
    });
  }

  async reschedule(id: string, dto: { startAt: string; notes?: string }) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: { service: true, staff: true },
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.status === 'CANCELLED') {
      throw new BadRequestException('Cannot reschedule a cancelled appointment');
    }

    const startAt = new Date(dto.startAt);
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('startAt must be a valid ISO date string');
    }

    const endAt = new Date(startAt.getTime() + appt.service.durationMin * 60_000);

    await this.assertWithinAvailability(appt.staffId, startAt, endAt);

    // Importante: conflicto ignorando el mismo appointment
    await this.assertNoConflictsExcept(appt.staffId, startAt, endAt, appt.id);

    return this.prisma.appointment.update({
      where: { id },
      data: {
        startAt,
        endAt,
        notes: dto.notes?.trim() ?? appt.notes ?? null,
      },
      include: { customer: true, service: true, staff: true },
    });
  }

  private async assertNoConflictsExcept(staffId: string, startAt: Date, endAt: Date, excludeId: string) {
    const conflict = await this.prisma.appointment.findFirst({
      where: {
        staffId,
        status: 'BOOKED',
        id: { not: excludeId },
        AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
      },
      select: { id: true, startAt: true, endAt: true },
    });

    if (conflict) {
      throw new ConflictException({
        message: 'Time slot is already booked',
        conflict,
      });
    }
  }
}
