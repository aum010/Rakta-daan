import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get abuse report by ID
   */
  async getAbuseReport(id: string) {
    const report = await this.prisma.abuse_reports.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Abuse report not found');
    }

    return report;
  }

  /**
   * List abuse reports
   */
  async listAbuseReports() {
    return this.prisma.abuse_reports.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * List donation camps
   */
  async listCamps() {
    return this.prisma.camps.findMany({
      orderBy: { starts_at: 'asc' },
    });
  }

  /**
   * Update organization verification
   */
  async updateOrganizationVerification(adminUserId: string, orgId: string, verified: boolean, note?: string) {
    const org = await this.prisma.organizations.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const adminUser = await this.prisma.users.findUnique({
      where: { id: adminUserId },
    });

    if (!adminUser || adminUser.role !== 'admin') {
      throw new ForbiddenException('Only admins can verify organizations');
    }

    const status = verified ? 'verified' : 'rejected';

    const updated = await this.prisma.organizations.update({
      where: { id: orgId },
      data: {
        verified: verified,
        verification_note: note,
        verified_at: verified ? new Date() : null,
      },
    });

    this.logger.log(`Organization ${orgId} verification updated to ${status}`);

    return updated;
  }

  /**
   * Get admin statistics
   */
  async getStats() {
    const [totalDonors, totalRequests, totalOrgs, totalCamps] = await Promise.all([
      this.prisma.donors.count(),
      this.prisma.requests.count(),
      this.prisma.organizations.count(),
      this.prisma.camps.count(),
    ]);

    return {
      donors: totalDonors,
      requests: totalRequests,
      organizations: totalOrgs,
      camps: totalCamps,
    };
  }
}



