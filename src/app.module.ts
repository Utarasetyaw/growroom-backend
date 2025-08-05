import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // 👈 1. Impor ConfigModule
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
import { CategoriesModule } from './categories/categories.module';
import { SubcategoriesModule } from './subcategories/subcategories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { ConversationsModule } from './conversations/conversations.module';
import { ChatMessagesModule } from './chat-messages/chat-messages.module';
import { ChatModule } from './chat/chat.module';
import { FinanceModule } from './finance/finance.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UserFrontendModule } from './user_frontend/user_frontend.module';
import { CartModule } from './cart/cart.module';

@Module({
  imports: [
    // 👇 2. Daftarkan di sini, di bagian paling atas
    ConfigModule.forRoot({
      isGlobal: true, // Membuat ConfigService tersedia di semua modul
    }),
    PrismaModule, 
    UsersModule, 
    AuthModule, 
    TestimonialsModule, 
    GeneralsettingModule, 
    LanguagesModule, 
    CurrenciesModule, 
    PaymentmethodModule, 
    ShippingProviderModule, 
    ShippingZoneModule, 
    ShippingRateModule, 
    CategoriesModule, 
    SubcategoriesModule, 
    ProductsModule, 
    OrdersModule, 
    ConversationsModule, 
    ChatMessagesModule, 
    ChatModule, 
    FinanceModule, 
    DashboardModule, 
    UserFrontendModule, 
    CartModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}