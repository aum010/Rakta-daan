import { Module } from '@nestjs/common';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { MatchingService } from './matching.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { DonorsModule } from '../donors/donors.module';

@Module({
  imports: [DatabaseModule, AuthModule, DonorsModule],
  controllers: [RequestsController],
  providers: [RequestsService, MatchingService],
  exports: [RequestsService],
})
export class RequestsModule {}
