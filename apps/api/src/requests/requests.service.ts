import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export enum Urgency {
  CRITICAL = 'critical',
  URGENT = 'urgent',
  STANDARD = 'standard',
}

export enum BloodGroup {
  A_POS = 'A_POS',
  A_NEG = 'A_NEG',
  B_POS = 'B_POS',
  B_NEG = 'B_NEG',
  AB_POS = 'AB_POS',
  AB_NEG = 'AB_NEG',
  O_POS = 'O_POS',
  O_NEG = 'O_NEG',
}

export enum BloodComponent {
  WHOLE_BLOOD = 'whole_blood',
  PRBC = 'prbc',
  PLATELETS = 'platelets',
  PLASMA = 'plasma',
}

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new blood request
   */
  async createRequest(userId: string, data: {
    blood_group_needed: BloodGroup;
    component?: BloodComponent;
    units_needed?: number;
    urgency?: Urgency;
    province_code: string;
    district_code: string;
    hospital_name: string;
    hospital_org_id?: string;
    needed_by: Date;
    contact_name: string;
    contact_phone: string;
    patient_reference?: string;
    clinical_note?: string;
    share_contact_publicly?: boolean;
  }) {
    const publicId = 'RD' + this.generatePublicId();

    const expiryHours = data.urgency === Urgency.CRITICAL ? 24 : data.urgency === Urgency.URGENT ? 72 : 168;

    const request = await this.prisma.requests.create({
      data: {
        public_id: publicId,
        blood_group_needed: data.blood_group_needed,
        component: data.component || 'whole_blood',
        units_needed: data.units_needed || 1,
        urgency: data.urgency || 'urgent',
        province_code: data.province_code,
        district_code: data.district_code,
        hospital_name: data.hospital_name,
        hospital_org_id: data.hospital_org_id,
        needed_by: data.needed_by,
        contact_name: data.contact_name,
        contact_phone: data.contact_phone,
        clinical_note: data.clinical_note,
        share_contact_publicly: data.share_contact_publicly || false,
      },
    });

    this.logger.log(`Created blood request ${publicId} for ${data.blood_group_needed}`);

    return request;
  }

  /**
   * Get blood request by public ID
   */
  async getRequestByPublicId(publicId: string) {
    const request = await this.prisma.requests.findUnique({
      where: { public_id: publicId },
    });

    if (!request) {
      throw new NotFoundException('Blood request not found');
    }

    return request;
  }

  /**
   * Get blood requests created by user
   */
  async getUserRequests(userId: string, status?: Urgency) {
    const where: any = {};
    if (status) where.status = status;

    return this.prisma.requests.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get open blood requests (public feed)
   */
  async getOpenRequests(filters?: {
    districtCode?: string;
    bloodGroup?: BloodGroup;
    limit?: number;
    offset?: number;
  }) {
    const { districtCode, bloodGroup, limit = 20, offset = 0 } = filters || {};

    const where: any = {
      status: 'open',
    };

    if (districtCode) where.district_code = districtCode;
    if (bloodGroup) where.blood_group_needed = bloodGroup;

    const [requests, total] = await Promise.all([
      this.prisma.requests.findMany({
        where,
        orderBy: [{ urgency: 'desc' }, { created_at: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.requests.count({ where }),
    ]);

    return {
      items: requests,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Close a blood request
   */
  async closeRequest(userId: string, publicId: string, reason?: string) {
    const request = await this.prisma.requests.findUnique({
      where: { public_id: publicId },
    });

    if (!request) {
      throw new NotFoundException('Blood request not found');
    }

    if (request.status !== 'open') {
      throw new BadRequestException('Request is already closed');
    }

    return this.prisma.requests.update({
      where: { public_id: publicId },
      data: {
        status: 'fulfilled',
        fulfilled_at: new Date(),
        cancellation_reason: reason || 'Request fulfilled',
      },
    });
  }

  /**
   * Cancel a blood request
   */
  async cancelRequest(userId: string, publicId: string, reason?: string) {
    const request = await this.prisma.requests.findUnique({
      where: { public_id: publicId },
    });

    if (!request) {
      throw new NotFoundException('Blood request not found');
    }

    if (request.status !== 'open') {
      throw new BadRequestException('Request is already closed');
    }

    return this.prisma.requests.update({
      where: { public_id: publicId },
      data: {
        status: 'cancelled',
        cancelled_at: new Date(),
        cancellation_reason: reason || 'Cancelled by requester',
      },
    });
  }

  /**
   * Get request statistics
   */
  async getRequestStats() {
    const total = await this.prisma.requests.count();
    const open = await this.prisma.requests.count({
      where: { status: 'open' },
    });
    const fulfilled = await this.prisma.requests.count({
      where: { status: 'fulfilled' },
    });
    const cancelled = await this.prisma.requests.count({
      where: { status: 'cancelled' },
    });
    const byUrgency = await this.prisma.requests.groupBy({
      by: ['urgency'],
      _count: { id: true },
    });
    const byBloodGroup = await this.prisma.requests.groupBy({
      by: ['blood_group_needed'],
      _count: { id: true },
    });

    return {
      total,
      open,
      fulfilled,
      cancelled,
      byUrgency: byUrgency.reduce((acc: Record<string, number>, item: any) => {
        acc[item.urgency] = item._count.id;
        return acc;
      }, {}),
      byBloodGroup: byBloodGroup.reduce((acc: Record<string, number>, item: any) => {
        acc[item.blood_group_needed] = item._count.id;
        return acc;
      }, {}),
    };
  }

  /**
   * Mask phone number for display
   */
  private maskPhone(phone: string): string {
    if (phone.length < 6) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(-3);
  }

  /**
   * Generate public ID
   */
  private generatePublicId(): string {
    return 'RD' + Buffer.from(require('crypto').randomBytes(6)).toString('hex').toUpperCase();
  }
}



