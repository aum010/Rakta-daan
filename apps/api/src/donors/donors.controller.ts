import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DonorsService } from './donors.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('donors')
@Controller('donors')
export class DonorsController {
  constructor(private readonly donorsService: DonorsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create donor profile' })
  @ApiResponse({ status: 201, description: 'Donor profile created' })
  @ApiResponse({ status: 400, description: 'User already has a donor profile' })
  async createDonor(
    @Request() req: any,
    @Body() body: {
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
    },
  ) {
    return this.donorsService.createDonor(req.user.userId, {
      blood_group: body.blood_group,
      sex: body.sex,
      date_of_birth: body.date_of_birth,
      weight_kg: body.weight_kg,
      province_code: body.province_code,
      district_code: body.district_code,
      municipality: body.municipality,
      ward: body.ward,
      name: body.name,
      phone: body.phone,
      phone_e164: body.phone_e164,
      consent_alerts: body.consent_alerts,
      consent_sms: body.consent_sms,
      consent_whatsapp: body.consent_whatsapp,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user donor profile' })
  @ApiResponse({ status: 200, description: 'Donor profile' })
  @ApiResponse({ status: 404, description: 'Donor profile not found' })
  async getMyDonorProfile(@Request() req: any) {
    return this.donorsService.getDonorByUserId(req.user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update donor profile' })
  @ApiResponse({ status: 200, description: 'Donor profile updated' })
  async updateDonor(
    @Request() req: any,
    @Body() body: Partial<{
      blood_group: string;
      weight_kg: number;
      province_code: string;
      district_code: string;
      municipality: string;
      ward: string;
    }>,
  ) {
    return this.donorsService.updateDonor(req.user.userId, body);
  }

  @Patch('availability')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update donor availability' })
  @ApiResponse({ status: 200, description: 'Availability updated' })
  async updateAvailability(
    @Request() req: any,
    @Body() body: { availability: 'available' | 'unavailable' | 'paused' },
  ) {
    return this.donorsService.updateAvailability(req.user.userId, body.availability);
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Withdraw donor profile' })
  @ApiResponse({ status: 200, description: 'Donor profile withdrawn' })
  async withdrawDonor(@Request() req: any) {
    return this.donorsService.withdrawDonor(req.user.userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get donor statistics' })
  @ApiResponse({ status: 200, description: 'Donor statistics' })
  async getDonorStats() {
    return this.donorsService.getDonorStats();
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find matching donors (admin/verified only)' })
  @ApiQuery({ name: 'blood_group', enum: ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'] })
  @ApiQuery({ name: 'district_code', type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findMatchingDonors(
    @Query('blood_group') bloodGroup: string,
    @Query('district_code') districtCode: string,
    @Query('limit') limit?: number,
  ) {
    return this.donorsService.findMatchingDonors({
      blood_group: bloodGroup,
      district_code: districtCode,
      limit: limit ? parseInt(limit.toString(), 10) : 50,
    });
  }
}
