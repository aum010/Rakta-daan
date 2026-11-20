import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { DonorsService } from '../donors/donors.service';
import { RequestsService } from '../requests/requests.service';
import { MatchingService } from '../requests/matching.service';
import { CleanupService } from './cleanup.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [
    DonorsService,
    RequestsService,
    MatchingService,
    CleanupService,
  ],
  exports: [
    CleanupService,
  ],
})
export class JobsModule {}
