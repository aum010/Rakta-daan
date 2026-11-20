import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CleanupService implements OnModuleInit {
  private readonly logger = new Logger(CleanupService.name);
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('Cleanup service initialized');
    await this.cleanup();
    
    this.cleanupInterval = setInterval(async () => {
      await this.cleanup();
    }, 6 * 60 * 60 * 1000);
  }

  /**
   * Full cleanup job
   */
  private async cleanup() {
    this.logger.log('Running scheduled cleanup');

    // Clear expired OTP codes
    try {
      await this.prisma.otp_codes.deleteMany({
        where: { expires_at: { lt: new Date() }, consumed_at: null },
      });
    } catch (e) {
      // Skip if otp_codes model doesn't exist
    }

    // Close expired requests
    try {
      await this.prisma.requests.updateMany({
        where: {
          needed_by: { lt: new Date() },
          status: 'open',
        },
        data: { status: 'fulfilled' },
      });
    } catch (e) {
      // Skip if requests model doesn't exist
    }

    // Clear old messages
    try {
      await (this.prisma as any).messages.deleteMany({
        where: {
          created_at: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });
    } catch (e) {
      // Skip if messages model doesn't exist
    }

    this.logger.log('Cleanup complete');
  }

  /**
   * Clean up on module destroy
   */
  async onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
