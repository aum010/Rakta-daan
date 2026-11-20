import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'crypto';

@Injectable()
export class OtpService {
  constructor(private configService: ConfigService) {}

  /**
   * Generate a 6-digit OTP
   */
  generateOtp(): string {
    return randomInt(100000, 999999).toString();
  }

  /**
   * Hash OTP with pepper for storage
   */
  hashOtp(otp: string): string {
    const pepper = this.configService.get<string>('otp.pepper') || 'default-pepper';
    return createHash('sha256')
      .update(otp + pepper)
      .digest('hex');
  }

  /**
   * Verify OTP against hash
   */
  verifyOtp(otp: string, hash: string): boolean {
    const computedHash = this.hashOtp(otp);
    return computedHash === hash;
  }
}
