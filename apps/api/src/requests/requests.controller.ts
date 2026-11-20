import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Urgency, BloodGroup } from './requests.service';


@ApiTags('requests')
@Controller('requests')
export class RequestsController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly matchingService: MatchingService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a blood request' })
  @ApiResponse({ status: 201, description: 'Blood request created' })
  async createRequest(
    @Request() req: any,
    @Body() body: {
      blood_group_needed: BloodGroup;
      component?: string;
      units_needed?: number;
      urgency?: string;
      province_code: string;
      district_code: string;
      hospital_name: string;
      hospital_org_id?: string;
      needed_by: string;
      contact_name: string;
      contact_phone: string;
      patient_reference?: string;
      clinical_note?: string;
      share_contact_publicly?: boolean;
    },
  ) {
    const request = await this.requestsService.createRequest(req.user.userId, {
      blood_group_needed: body.blood_group_needed,
      component: body.component as any,
      units_needed: body.units_needed,
      urgency: body.urgency as any,
      province_code: body.province_code,
      district_code: body.district_code,
      hospital_name: body.hospital_name,
      hospital_org_id: body.hospital_org_id,
      needed_by: new Date(body.needed_by),
      contact_name: body.contact_name,
      contact_phone: body.contact_phone,
      patient_reference: body.patient_reference,
      clinical_note: body.clinical_note,
      share_contact_publicly: body.share_contact_publicly,
    });

    this.matchingService.findAndNotifyDonors(request.id).catch(console.error);

    return request;
  }

  @Get()
  @ApiOperation({ summary: 'Get open blood requests' })
  @ApiQuery({ name: 'district_code', required: false })
  @ApiQuery({ name: 'BloodGroup', required: false, enum: BloodGroup })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getOpenRequests(
    @Query('district_code') districtCode?: string,
    @Query('BloodGroup') bloodGroup?: BloodGroup,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.requestsService.getOpenRequests({
      districtCode,
      bloodGroup,
      limit: limit ? parseInt(limit.toString(), 10) : 20,
      offset: offset ? parseInt(offset.toString(), 10) : 0,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my blood requests' })
  @ApiQuery({ name: 'status', required: false, enum: Urgency })
  async getMyRequests(
    @Request() req: any,
    @Query('status') status?: Urgency,
  ) {
    return this.requestsService.getUserRequests(req.user.userId, status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get request statistics' })
  async getRequestStats() {
    return this.requestsService.getRequestStats();
  }

  @Get(':public_id')
  @ApiOperation({ summary: 'Get blood request by public ID' })
  @ApiResponse({ status: 200, description: 'Blood request details' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async getRequest(@Param('public_id') publicId: string) {
    return this.requestsService.getRequestByPublicId(publicId);
  }

  @Post(':public_id/close')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close a blood request as fulfilled' })
  @ApiResponse({ status: 200, description: 'Request closed' })
  async closeRequest(
    @Request() req: any,
    @Param('public_id') publicId: string,
    @Body() body: { reason?: string },
  ) {
    return this.requestsService.closeRequest(req.user.userId, publicId, body.reason);
  }

  @Post(':public_id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a blood request' })
  @ApiResponse({ status: 200, description: 'Request cancelled' })
  async cancelRequest(
    @Request() req: any,
    @Param('public_id') publicId: string,
    @Body() body: { reason?: string },
  ) {
    return this.requestsService.cancelRequest(req.user.userId, publicId, body.reason);
  }

  @Post(':public_id/notify-more')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Notify more donors for a request' })
  @ApiResponse({ status: 200, description: 'Donors notified' })
  async notifyMoreDonors(
    @Request() req: any,
    @Param('public_id') publicId: string,
    @Body() body: { limit?: number },
  ) {
    const request = await this.requestsService.getRequestByPublicId(publicId);

    if (request.id !== req.user.userId) {
      throw new Error('You can only notify donors for your own requests');
    }

    return this.matchingService.findAndNotifyDonors(request.id, body.limit || 20);
  }

  @Post(':public_id/respond')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Respond to a blood request (as donor)' })
  @ApiResponse({ status: 200, description: 'Response recorded' })
  async respondToRequest(
    @Request() req: any,
    @Param('public_id') publicId: string,
    @Body() body: { status: 'interested' | 'declined'; note?: string },
  ) {
    return { message: 'Response recorded', public_id: publicId, status: body.status };
  }

  @Post('respond/:token')
  @ApiOperation({ summary: 'Respond to notification via token (no auth)' })
  @ApiResponse({ status: 200, description: 'Response recorded' })
  async respondViaToken(
    @Param('token') token: string,
    @Body() body: { status: 'interested' | 'declined'; note?: string },
  ) {
    // This endpoint is a placeholder - actual response handling is done in NestJS
    return { message: 'Response endpoint handled by NestJS backend' };
  }
}

