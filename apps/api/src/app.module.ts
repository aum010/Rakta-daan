import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MockDatabaseModule } from './database/mock-database.module';
import { AuthModule } from './auth/auth.module';
import { DonorsModule } from './donors/donors.module';
import { RequestsModule } from './requests/requests.module';
import { InvitationsModule } from './invitations/invitations.module';
import { AdminModule } from './admin/admin.module';
import { JobsModule } from './jobs/jobs.module';
import { RedisModule } from './redis/redis.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import configuration from './config/configuration';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Modules
    MockDatabaseModule,
    AuthModule,
    DonorsModule,
    RequestsModule,
    InvitationsModule,
    AdminModule,
    JobsModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModule {}
