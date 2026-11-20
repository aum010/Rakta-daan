import { Module, Global, Logger } from '@nestjs/common';

@Global()
@Module({
  providers: [
    {
      provide: 'PrismaService',
      useValue: {
        $connect: async () => {
          Logger.log('Mock database connected (no real database)');
        },
        $disconnect: async () => {
          Logger.log('Mock database disconnected');
        },
        donors: {
          findUnique: async () => null,
          findMany: async () => [],
          create: async (data: any) => ({ id: 'mock-id', ...data }),
          update: async () => ({}),
          delete: async () => ({}),
        },
        requests: {
          findUnique: async () => null,
          findMany: async () => [],
          create: async (data: any) => ({ id: 'mock-id', ...data }),
          update: async () => ({}),
          delete: async () => ({}),
          count: async () => 0,
        },
        invitations: {
          findUnique: async () => null,
          findMany: async () => [],
          create: async (data: any) => ({ id: 'mock-id', ...data }),
          update: async () => ({}),
          delete: async () => ({}),
        },
        abuse_reports: {
          findUnique: async () => null,
          findMany: async () => [],
          create: async (data: any) => ({ id: 'mock-id', ...data }),
          update: async () => ({}),
          delete: async () => ({}),
        },
        blood_inventory: {
          findUnique: async () => null,
          findMany: async () => [],
          create: async (data: any) => ({ id: 'mock-id', ...data }),
          update: async () => ({}),
          delete: async () => ({}),
        },
        camps: {
          findUnique: async () => null,
          findMany: async () => [],
          create: async (data: any) => ({ id: 'mock-id', ...data }),
          update: async () => ({}),
          delete: async () => ({}),
        },
        organizations: {
          findUnique: async () => null,
          findMany: async () => [],
          create: async (data: any) => ({ id: 'mock-id', ...data }),
          update: async () => ({}),
          delete: async () => ({}),
        },
        users: {
          findUnique: async () => null,
          findMany: async () => [],
          create: async (data: any) => ({ id: 'mock-id', ...data }),
          update: async () => ({}),
          delete: async () => ({}),
        },
      },
    },
  ],
  exports: ['PrismaService'],
})
export class MockDatabaseModule {}
