import { Module } from '@nestjs/common';
import { UserFrontendService } from './user_frontend.service';
import { UserFrontendController } from './user_frontend.controller';

// Impor module lain yang service-nya akan digunakan
import { CategoriesModule } from '../categories/categories.module';
import { ProductsModule } from '../products/products.module';
import { TestimonialsModule } from '../testimonials/testimonials.module';
import { GeneralsettingModule } from '../generalsetting/generalsetting.module';
import { SubcategoriesModule } from '../subcategories/subcategories.module';
import { UsersModule } from '../users/users.module';

@Module({
  // Daftarkan semua module di sini agar service-nya dapat di-inject
  imports: [
    CategoriesModule,
    ProductsModule,
    TestimonialsModule,
    GeneralsettingModule,
    SubcategoriesModule,
    UsersModule,
  ],
  controllers: [UserFrontendController],
  providers: [UserFrontendService],
})
export class UserFrontendModule {}