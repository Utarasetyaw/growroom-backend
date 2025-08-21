import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));
  
  app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // --- KONFIGURASI CORS ---

  // Untuk DEVELOPMENT: Izinkan semua origin agar mudah diakses dari localhost
  // PENTING: Untuk PRODUCTION, ganti 'origin: true' dengan whitelist yang spesifik di bawah
  app.enableCors({
    origin: true, // Izinkan semua origin
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  /*
  // ================================================================
  // CONTOH KONFIGURASI CORS UNTUK PRODUCTION (Gunakan ini saat deploy)
  // ================================================================
  const whitelist = [
    'https://growroom.id', 
    'https://admin.growroom.id',
    'https://backend.growroom.id'
  ];

  app.enableCors({
      origin: function (origin, callback) {
        if (!origin || whitelist.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
  });
  */

  const config = new DocumentBuilder()
    .setTitle('Daunx.id API')
    .setDescription('Dokumentasi API untuk GrowRoom')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3007);
}
bootstrap();