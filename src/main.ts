import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

// --- Impor Swagger ---
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // --- Konfigurasi Swagger ---
  const config = new DocumentBuilder()
    .setTitle('Growroom API') // Ganti dengan judul yang sesuai
    .setDescription('Dokumentasi API Growroom') // Ganti dengan deskripsi yang sesuai
    .setVersion('1.0')
    .addBearerAuth() // Tambahkan ini jika Anda menggunakan otentikasi JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // URL untuk dokumentasi menjadi /api
  SwaggerModule.setup('api', app, document);
  // -------------------------


  await app.listen(3000);
}
bootstrap();