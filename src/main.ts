import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
// Ditambahkan untuk proteksi Swagger
import * as basicAuth from 'express-basic-auth';

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
  
  // Kode ini tetap ada
  app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // --- KONFIGURASI CORS ---
  // Kode ini tetap ada
  // app.enableCors({
  //   origin: true, // Izinkan semua origin
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  //   credentials: true,
  // });

  
  // Kode komentar ini juga tetap ada untuk referensi Anda
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
  

  // --- PROTEKSI SWAGGER DENGAN PASSWORD ---
  // Ini adalah kode baru yang ditambahkan
  app.use(
    ['/api', '/api-json'],
    basicAuth({
      challenge: true,
      users: {
        [(process.env.SWAGGER_USER || 'satulini.id')]: process.env.SWAGGER_PASSWORD || 'LiniGrowup@123',
      },
    }),
  );

  // --- SETUP SWAGGER ---
  // Kode ini tetap ada
  const config = new DocumentBuilder()
    .setTitle('GrowRoom API')
    .setDescription('Dokumentasi API untuk GrowRoom')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3006);
}
bootstrap();