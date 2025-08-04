// File: src/user-frontend/dto/page-responses.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from '../../products/dto/product-response.dto';
import { CategoryResponseDto } from '../../categories/dto/category-response.dto';
import { SubcategoryResponseDto } from '../../subcategories/dto/subcategory-response.dto';
import { GeneralSettingResponseDto } from '../../generalsetting/dto/general-setting-response.dto';
import { LanguageResponseDto } from '../../languages/dto/language-response.dto';
import { CurrencyResponseDto } from '../../currencies/dto/currency-response.dto';
import { MyProfileResponseDto } from '../../users/dto/my-profile-response.dto';
// Anda mungkin perlu membuat DTO ini jika belum ada
import { CartResponseDto } from '../../cart/dto/cart-response.dto';
import { ShippingZoneResponseDto } from '../../shipping-zone/dto/shipping-zone-response.dto';
import { PaymentMethodResponseDto } from '../../paymentmethod/dto/payment-method-response.dto';

// --- DTO untuk Halaman Detail Produk ---
export class ProductDetailPageResponseDto {
  @ApiProperty({ type: ProductResponseDto })
  productDetail: ProductResponseDto;

  @ApiProperty({ type: [ProductResponseDto] })
  bestProducts: ProductResponseDto[];
}

// --- DTO untuk Halaman Semua Produk ---
class PaginationMetaDto {
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
class PaginatedProductsDto {
  @ApiProperty({ type: [ProductResponseDto] })
  data: ProductResponseDto[];
  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
export class AllProductsPageResponseDto {
  @ApiProperty({ type: [CategoryResponseDto] })
  categories: CategoryResponseDto[];
  @ApiProperty({ type: [SubcategoryResponseDto] })
  subCategories: SubcategoryResponseDto[];
  @ApiProperty({ type: PaginatedProductsDto })
  products: PaginatedProductsDto;
}

// --- DTO untuk Layout ---
class LayoutSettingsDto {
  @ApiProperty() shopName: any;
  @ApiProperty() shopDescription: any;
  @ApiProperty() logoUrl: string;
  @ApiProperty() faviconUrl: string;
  @ApiProperty() address: string;
  @ApiProperty() socialMedia: any;
}
export class LayoutResponseDto {
  @ApiProperty({ type: LayoutSettingsDto })
  layoutSettings: LayoutSettingsDto;
  @ApiProperty({ type: [LanguageResponseDto] })
  activeLanguages: LanguageResponseDto[];
  @ApiProperty({ type: [CurrencyResponseDto] })
  activeCurrencies: CurrencyResponseDto[];
}

// --- DTO untuk Halaman Checkout ---
export class CheckoutPageResponseDto {
  @ApiProperty({ type: CartResponseDto })
  cart: CartResponseDto;
  @ApiProperty({ type: MyProfileResponseDto })
  userProfile: MyProfileResponseDto;
  @ApiProperty({ type: [ShippingZoneResponseDto] })
  shippingMethods: ShippingZoneResponseDto[];
  @ApiProperty({ type: [PaymentMethodResponseDto] })
  paymentMethods: PaymentMethodResponseDto[];
}