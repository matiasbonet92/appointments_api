import { Module } from '@nestjs/common';
import { ReadyController } from './ready.controller';
import { DbModule } from 'src/db/db.module';

@Module({
  imports: [DbModule],
  controllers: [ReadyController],
})
export class ReadyModule {}
