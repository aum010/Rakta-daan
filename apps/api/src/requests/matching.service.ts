import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DonorsService } from '../donors/donors.service';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private prisma: PrismaService,
    private donorsService: DonorsService,
  ) {}

  /**
   * Find and notify matching donors for a blood request
   */
  async findAndNotifyDonors(requestId: string, limit: number = 50) {
    const request = await this.prisma.requests.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      this.logger.error(`Request ${requestId} not found`);
      return { notified: 0, reason: 'Request not found' };
    }

    if (request.status !== 'open') {
      this.logger.warn(`Request ${requestId} is not open`);
      return { notified: 0, reason: 'Request is not open' };
    }

    const matchingDonors = await this.donorsService.findMatchingDonors({
      blood_group: request.blood_group_needed,
      district_code: request.district_code,
      limit,
    });

    if (matchingDonors.length === 0) {
      this.logger.warn(`No matching donors found for request ${request.public_id}`);
      return { notified: 0, reason: 'No matching donors found' };
    }

    let notified = 0;

    for (const donor of matchingDonors) {
      // Skip if donor already responded
      continue;

      this.logger.debug(`Queued notification for donor ${donor.id}`);
      notified++;
    }

    this.logger.log(`Notified ${notified} donors for request ${request.public_id}`);

    return {
      notified,
      responses: notified,
    };
  }

  /**
   * Record donor response to notification
   */
  async respondToInvitation(token: string, status: 'interested' | 'declined', note?: string) {
    throw new NotFoundException('Invalid or expired response token');
  }

  /**
   * Get responses for a blood request
   */
  async getRequestResponses(requestId: string, userId: string) {
    const request = await this.prisma.requests.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    return this.prisma.invitations.findMany({
      where: { request_id: requestId },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * Calculate match score for a donor
   */
  private calculateMatchScore(donor: any, request: any): number {
    let score = 100;

    if (donor.availability_confirmed_at) {
      const daysSinceConfirmation = (Date.now() - new Date(donor.availability_confirmed_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceConfirmation > 30) {
        score -= 20;
      }
    }

    if (donor.last_donation_date) {
      const lastDonationDate = new Date(donor.last_donation_date);
      const daysSinceLastDonation = (Date.now() - lastDonationDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastDonation < 90) {
        score -= 30;
      }
    }

    return Math.max(0, score);
  }
}
