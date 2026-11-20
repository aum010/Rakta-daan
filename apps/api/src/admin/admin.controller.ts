import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('abuse/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get abuse report by ID' })
  @ApiResponse({ status: 200, description: 'Abuse report details' })
  async getAbuseReport(@Param('id') id: string) {
    return this.adminService.getAbuseReport(id);
  }

  @Get('camps')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List donation camps' })
  @ApiResponse({ status: 200, description: 'List of camps' })
  async listCamps() {
    return this.adminService.listCamps();
  }

  @Post('orgs/:id/verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve/reject organization verification' })
  @ApiResponse({ status: 200, description: 'Verification updated' })
  async updateVerification(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { verified: boolean; note?: string },
  ) {
    return this.adminService.updateOrganizationVerification(req.user.userId, id, body.verified, body.note);
  }

  @Get('abuse')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List abuse reports' })
  @ApiResponse({ status: 200, description: 'List of abuse reports' })
  async listAbuseReports() {
    return this.adminService.listAbuseReports();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin statistics' })
  @ApiResponse({ status: 200, description: 'Admin statistics' })
  async getStats() {
    return this.adminService.getStats();
  }
}
