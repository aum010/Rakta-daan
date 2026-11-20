import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    } as any);
  }

  async onModuleInit() {
    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).$on('query', (e: any) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');

      // Enable PostGIS extension if not already enabled
      await this.enablePostGIS();
    } catch (error) {
      this.logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async enableShutdownHooks(app: any) {
    (this as any).$on('beforeExit', async () => {
      await app.close();
    });
  }

  /**
   * Enable PostGIS extension for geospatial queries
   */
  private async enablePostGIS() {
    try {
      await this.$executeRaw`CREATE EXTENSION IF NOT EXISTS postgis`;
      this.logger.log('✅ PostGIS extension enabled');
    } catch (error) {
      this.logger.warn('PostGIS extension could not be enabled (may require superuser):', error);
    }
  }

  /**
   * Find donors within a radius of a point using PostGIS
   * @param longitude - Center longitude
   * @param latitude - Center latitude
   * @param radiusKm - Search radius in kilometers
   * @param options - Filter options (blood group, availability, etc.)
   */
  async findDonorsWithinRadius(
    longitude: number,
    latitude: number,
    radiusKm: number,
    options?: {
      bloodGroup?: string;
      availability?: string;
      limit?: number;
    }
  ) {
    const bloodGroupFilter = options?.bloodGroup
      ? this.$queryRaw`AND "blood_group" = ${options.bloodGroup}`
      : this.$queryRaw``;

    const availabilityFilter = options?.availability
      ? this.$queryRaw`AND availability = ${options.availability}`
      : this.$queryRaw``;

    const limitClause = options?.limit
      ? this.$queryRaw`LIMIT ${options.limit}`
      : this.$queryRaw``;

    const results = await this.$queryRaw<any[]>`
      SELECT
        d.id,
        d.user_id,
        d.blood_group,
        d.availability,
        d.district_code,
        u.name,
        u.phone_masked,
        ST_Distance(
          d.location::geography,
          ST_MakePoint(${longitude}, ${latitude})::geography
        ) / 1000 as distance_km
      FROM donors d
      JOIN users u ON d.user_id = u.id
      WHERE d.location IS NOT NULL
        AND d.availability = 'available'
        ${bloodGroupFilter}
        ${availabilityFilter}
        AND ST_DWithin(
          d.location::geography,
          ST_MakePoint(${longitude}, ${latitude})::geography,
          ${radiusKm * 1000}
        )
      ORDER BY distance_km ASC
      ${limitClause}
    `;

    return results;
  }

  /**
   * Update donor's location from latitude/longitude
   * @param donorId - Donor UUID
   * @param longitude - Longitude coordinate
   * @param latitude - Latitude coordinate
   */
  async updateDonorLocation(donorId: string, longitude: number, latitude: number) {
    await this.$executeRaw`
      UPDATE donors
      SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      WHERE id = ${donorId}
    `;
  }

  /**
   * Update blood request location from latitude/longitude
   * @param requestId - Blood request UUID
   * @param longitude - Longitude coordinate
   * @param latitude - Latitude coordinate
   */
  async updateRequestLocation(requestId: string, longitude: number, latitude: number) {
    await this.$executeRaw`
      UPDATE blood_requests
      SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      WHERE id = ${requestId}
    `;
  }

  /**
   * Calculate distance between two points in kilometers
   */
  async calculateDistance(
    lon1: number,
    lat1: number,
    lon2: number,
    lat2: number
  ): Promise<number> {
    const result = await this.$queryRaw<[{ distance_km: number }]>`
      SELECT ST_Distance(
        ST_MakePoint(${lon1}, ${lat1})::geography,
        ST_MakePoint(${lon2}, ${lat2})::geography
      ) / 1000 as distance_km
    `;
    return result[0].distance_km;
  }

  /**
   * Backfill location columns from existing lat/lon in districts table
   * Run this once after migration to populate PostGIS columns
   */
  async backfillLocationsFromDistricts() {
    this.logger.log('Backfilling donor locations from district coordinates...');

    // Update donors with their district coordinates
    const donorResult = await this.$executeRaw`
      UPDATE donors d
      SET location = ST_SetSRID(
        ST_MakePoint(districts.longitude, districts.latitude),
        4326
      )::geography
      FROM districts
      WHERE d.district_code = districts.code
      AND d.location IS NULL
    `;

    this.logger.log(`Updated ${donorResult} donor locations`);

    // Update blood requests with their district coordinates
    const requestResult = await this.$executeRaw`
      UPDATE blood_requests br
      SET location = ST_SetSRID(
        ST_MakePoint(districts.longitude, districts.latitude),
        4326
      )::geography
      FROM districts
      WHERE br.district_code = districts.code
      AND br.location IS NULL
    `;

    this.logger.log(`Updated ${requestResult} blood request locations`);

    return { donors: donorResult, requests: requestResult };
  }
}
