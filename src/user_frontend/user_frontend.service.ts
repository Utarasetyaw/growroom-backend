import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { GeneralsettingService } from '../generalsetting/generalsetting.service';
import { ProductsService } from '../products/products.service';
import { TestimonialsService } from '../testimonials/testimonials.service';
import { SubcategoriesService } from '../subcategories/subcategories.service';
import { UsersService } from '../users/users.service';
import { CartService } from '../cart/cart.service';
import { PaymentmethodService } from '../paymentmethod/paymentmethod.service';
import { ShippingZoneService } from '../shipping-zone/shipping-zone.service';
import { LanguagesService } from '../languages/languages.service';
import { CurrenciesService } from '../currencies/currencies.service';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { UpdateMyProfileDto } from '../users/dto/update-my-profile.dto';

@Injectable()
export class UserFrontendService {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly productsService: ProductsService,
    private readonly testimonialsService: TestimonialsService,
    private readonly generalsettingService: GeneralsettingService,
    private readonly subcategoriesService: SubcategoriesService,
    private readonly usersService: UsersService,
    private readonly cartService: CartService,
    private readonly paymentMethodService: PaymentmethodService,
    private readonly shippingZoneService: ShippingZoneService,
    private readonly languagesService: LanguagesService,
    private readonly currenciesService: CurrenciesService,
  ) {}

  async getHomepageData() {
    const [categories, bestProducts, testimonials, generalSettings] =
      await Promise.all([
        this.categoriesService.findAll(),
        this.productsService.findBestProducts(8),
        this.testimonialsService.findAll(),
        this.generalsettingService.findForHomepage(),
      ]);

    return {
      categories,
      bestProducts,
      testimonials,
      generalSettings,
    };
  }

  async getProductsPageData(query: GetProductsQueryDto) {
    const [categories, subCategories, paginatedProducts] = await Promise.all([
      this.categoriesService.findAll(),
      this.subcategoriesService.findAll(),
      this.productsService.findPaginated(query),
    ]);

    return {
      categories,
      subCategories,
      products: paginatedProducts,
    };
  }

  async getProductDetailPageData(id: number) {
    const productDetail = await this.productsService.findOnePublic(id);
    const bestProducts = await this.productsService.findBestProducts(8);

    return {
      productDetail,
      bestProducts,
    };
  }

  async getAboutPageData() {
    return this.generalsettingService.findForAboutPage();
  }

  async getNavAndFooterData() {
    const [layoutSettings, activeLanguages, activeCurrencies] =
      await Promise.all([
        this.generalsettingService.findForNavAndFooter(),
        this.languagesService.findAllActive(),
        this.currenciesService.findAllActive(),
      ]);

    return {
      layoutSettings,
      activeLanguages,
      activeCurrencies,
    };
  }

  async getMyProfile(userId: number) {
    return this.usersService.findMe(userId);
  }

  async updateMyProfile(userId: number, dto: UpdateMyProfileDto) {
    return this.usersService.updateMe(userId, dto);
  }

  async getCheckoutPageData(userId: number) {
    const [cart, userProfile, shippingMethods, paymentMethods] = await Promise.all([
      this.cartService.getCart(userId),
      this.usersService.findMe(userId),
      this.shippingZoneService.findAllActive(),
      this.paymentMethodService.findAllActive(),
    ]);

    return {
      cart,
      userProfile,
      shippingMethods,
      paymentMethods,
    };
  }
}