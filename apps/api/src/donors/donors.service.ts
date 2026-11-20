import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DonorsService {
  private readonly logger = new Logger(DonorsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a donor profile for a user
   */
  async createDonor(userId: string, data: {
    blood_group: string;
    sex: string;
    date_of_birth: string;
    weight_kg?: number;
    province_code: string;
    district_code: string;
    municipality?: string;
    ward?: string;
    name: string;
    phone: string;
    phone_e164: string;
    consent_alerts: boolean;
    consent_sms: boolean;
    consent_whatsapp: boolean;
  }) {
    // Check if user already has a donor profile
    const existingDonor = await this.prisma.donors.findUnique({
      where: { user_id: userId },
    });

    if (existingDonor) {
      throw new BadRequestException('User already has a donor profile');
    }

    // Create donor profile
    const donor = await this.prisma.donors.create({
      data: {
        user_id: userId,
        name: data.name,
        phone: data.phone,
        phone_e164: data.phone_e164,
        blood_group: data.blood_group,
        sex: data.sex,
        date_of_birth: data.date_of_birth,
        weight_kg: data.weight_kg,
        province_code: data.province_code,
        district_code: data.district_code,
        municipality: data.municipality,
        ward: data.ward,
        consent_alerts: data.consent_alerts,
        consent_sms: data.consent_sms,
        consent_whatsapp: data.consent_whatsapp,
        availability: 'available',
      },
    });

    return donor;
  }

  /**
   * Get donor profile by user ID
   */
  async getDonorByUserId(userId: string) {
    const donor = await this.prisma.donors.findUnique({
      where: { user_id: userId },
    });

    if (!donor) {
      throw new NotFoundException('Donor profile not found');
    }

    return donor;
  }

  /**
   * Update donor profile
   */
  async updateDonor(userId: string, data: Partial<{
    blood_group: string;
    weight_kg: number;
    province_code: string;
    district_code: string;
    municipality: string;
    ward: string;
  }>) {
    const donor = await this.prisma.donors.findUnique({
      where: { user_id: userId },
    });

    if (!donor) {
      throw new NotFoundException('Donor profile not found');
    }

    return this.prisma.donors.update({
      where: { user_id: userId },
      data,
    });
  }

  /**
   * Update donor availability
   */
  async updateAvailability(userId: string, availability: 'available' | 'unavailable' | 'paused') {
    const donor = await this.prisma.donors.findUnique({
      where: { user_id: userId },
    });

    if (!donor) {
      throw new NotFoundException('Donor profile not found');
    }

    return this.prisma.donors.update({
      where: { user_id: userId },
      data: {
        availability,
        availability_confirmed_at: new Date(),
      },
    });
  }

  /**
   * Find matching donors for a blood request
   */
  async findMatchingDonors(params: {
    blood_group: string;
    district_code: string;
    limit?: number;
  }) {
    const { blood_group, district_code, limit = 50 } = params;

    const donors = await this.prisma.donors.findMany({
      where: {
        blood_group,
        district_code,
        availability: 'available',
        withdrawn_at: null,
      },
      take: limit,
      orderBy: {
        availability_confirmed_at: 'asc',
      },
    });

    return donors;
  }

  /**
   * Withdraw donor profile
   */
  async withdrawDonor(userId: string) {
    const donor = await this.prisma.donors.findUnique({
      where: { user_id: userId },
    });

    if (!donor) {
      throw new NotFoundException('Donor profile not found');
    }

    return this.prisma.donors.update({
      where: { user_id: userId },
      data: {
        withdrawn_at: new Date(),
        availability: 'unavailable',
      },
    });
  }

  /**
   * Get donor statistics
   */
  async getDonorStats() {
    const total = await this.prisma.donors.count();
    const available = await this.prisma.donors.count({
      where: { availability: 'available' },
    });
    const byBloodGroup = await this.prisma.donors.groupBy({
      by: ['blood_group'],
      _count: { id: true },
    });

    return {
      total,
      available,
      unavailable: total - available,
      byBloodGroup: byBloodGroup.reduce((acc: Record<string, number>, item: any) => {
        acc[item.blood_group] = item._count.id;
        return acc;
      }, {}),
    };
  }
}
