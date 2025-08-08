// src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Mengatur prefix global untuk semua route, misal: /api/v1/users
  app.setGlobalPrefix('api/v1');

  // Menambahkan middleware untuk file statis (jika diperlukan)
  // Contoh: untuk menyajikan file dari folder 'uploads' di http://.../uploads/file.jpg
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Konfigurasi CORS (Cross-Origin Resource Sharing) yang aman untuk production
  const whitelist = [
    'https://growroom.id', // Ganti dengan port frontend development Anda
    'https://admin.growroom.id', // Ganti dengan domain frontend production Anda
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

  // Menerapkan ValidationPipe secara global
  // Ini akan otomatis memvalidasi semua DTO yang masuk berdasarkan decorator class-validator
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,      // Mengabaikan properti yang tidak ada di DTO
    transform: true,      // Mengubah payload yang masuk menjadi instance DTO
    forbidNonWhitelisted: true, // Melempar error jika ada properti yang tidak diizinkan
    transformOptions: {
      enableImplicitConversion: true, // Mengonversi tipe data secara implisit
    },
  }));

  // Konfigurasi untuk dokumentasi API Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Nama Proyek API')
    .setDescription('Dokumentasi lengkap untuk API Proyek ini.')
    .setVersion('1.0')
    .addBearerAuth() // Menambahkan opsi otorisasi Bearer Token (JWT)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // Endpoint untuk mengakses dokumentasi adalah /api-docs
  SwaggerModule.setup('api-docs', app, document);

  // Menjalankan aplikasi pada port yang ditentukan di environment variable atau default 3000
  const port = process.env.PORT || 3006;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📄 Swagger documentation is available at: http://localhost:${port}/api-docs`);
}

bootstrap();