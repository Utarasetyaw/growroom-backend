import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,      // Mengabaikan properti yang tidak ada di DTO
    transform: true,      // Mengubah payload yang masuk menjadi instance DTO
    forbidNonWhitelisted: true, // Melempar error jika ada properti yang tidak diizinkan
    transformOptions: {
      enableImplicitConversion: true, // Mengonversi tipe data secara implisit
    },
  }));
  
  app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), {
    prefix: '/uploads/',
  });

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