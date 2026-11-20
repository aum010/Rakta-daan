import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Security
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Rakta-Daan API')
    .setDescription('Blood discovery and donor coordination API for Nepal')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('donors', 'Donor management')
    .addTag('requests', 'Blood requests')
    .addTag('invitations', 'Donor invitations')
    .addTag('facilities', 'Hospitals and blood banks')
    .addTag('inventory', 'Blood inventory')
    .addTag('admin', 'Administration')
    .addTag('health', 'Health checks')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start server
  const port = process.env.PORT || 4000;
  await app.listen(port);
  
  console.log(`🚀 NestJS API listening on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
