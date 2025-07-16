import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { GeneralsettingModule } from './generalsetting/generalsetting.module';
import { LanguagesModule } from './languages/languages.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { PaymentmethodModule } from './paymentmethod/paymentmethod.module';
import { ShippingProviderModule } from './shipping-provider/shipping-provider.module';
import { ShippingZoneModule } from './shipping-zone/shipping-zone.module';
import { ShippingRateModule } from './shipping-rate/shipping-rate.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, TestimonialsModule, GeneralsettingModule, LanguagesModule, CurrenciesModule, PaymentmethodModule, ShippingProviderModule, ShippingZoneModule, ShippingRateModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}