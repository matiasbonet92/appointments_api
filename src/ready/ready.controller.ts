import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('ready')
export class ReadyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async ready() {
    try {
      await this.prisma.ping();
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException('Db not reachable');
    }
  }
}
