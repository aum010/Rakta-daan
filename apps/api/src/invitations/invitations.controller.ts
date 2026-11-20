import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get('token/:token')
  @ApiOperation({ summary: 'Get invitation details via token' })
  @ApiResponse({ status: 200, description: 'Invitation details' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async getInvitation(@Param('token') token: string) {
    return this.invitationsService.getInvitationByToken(token);
  }

  @Post('token/:token/accept')
  @ApiOperation({ summary: 'Accept invitation to donate' })
  @ApiResponse({ status: 200, description: 'Invitation accepted' })
  @ApiResponse({ status: 400, description: 'Invitation expired or already processed' })
  async acceptInvitation(@Param('token') token: string) {
    return this.invitationsService.acceptInvitation(token);
  }

  @Post('token/:token/decline')
  @ApiOperation({ summary: 'Decline invitation to donate' })
  @ApiResponse({ status: 200, description: 'Invitation declined' })
  @ApiResponse({ status: 400, description: 'Invitation expired or already processed' })
  async declineInvitation(@Param('token') token: string, @Body() body: { reason?: string }) {
    return this.invitationsService.declineInvitation(token, body.reason);
  }

  @Post(':id/withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Withdraw invitation (admin)' })
  @ApiResponse({ status: 200, description: 'Invitation withdrawn' })
  async withdrawInvitation(@Request() req: any, @Param('id') id: string) {
    return this.invitationsService.withdrawInvitation(req.user.userId, id);
  }
}
