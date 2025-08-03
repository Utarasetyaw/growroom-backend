import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { GeneralsettingService } from '../generalsetting/generalsetting.service';
import { ProductsService } from '../products/products.service';
import { TestimonialsService } from '../testimonials/testimonials.service';
import { SubcategoriesService } from '../subcategories/subcategories.service';
import { UsersService } from '../users/users.service';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { UpdateMyProfileDto } from '../users/dto/update-my-profile.dto';

@Injectable()
export class UserFrontendService {
  constructor(
    // Services yang sudah ada sebelumnya
    private readonly categoriesService: CategoriesService,
    private readonly productsService: ProductsService,
    private readonly testimonialsService: TestimonialsService,
    private readonly generalsettingService: GeneralsettingService,
    private readonly subcategoriesService: SubcategoriesService,
    // 👇 Tambahkan UsersService di sini
    private readonly usersService: UsersService,
  ) {}

  /**
   * Mengambil data untuk halaman utama (homepage).
   */
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

  /**
   * Mengambil data untuk halaman "Semua Produk" dengan paginasi dan filter.
   */
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

  /**
   * Mengambil data untuk halaman detail produk.
   * @param id ID dari produk yang ingin ditampilkan.
   */
  async getProductDetailPageData(id: number) {
    const [productDetail, bestProducts] = await Promise.all([
      this.productsService.findOne(id),
      this.productsService.findBestProducts(8),
    ]);

    if (!productDetail) {
      throw new NotFoundException(`Product with ID ${id} not found.`);
    }

    return {
      productDetail,
      bestProducts,
    };
  }

  /**
   * Mengambil data untuk halaman "About".
   */
  async getAboutPageData() {
    return this.generalsettingService.findOne();
  }

  /**
   * Mengambil data untuk komponen layout (Nav & Footer).
   */
  async getNavAndFooterData() {
    return this.generalsettingService.findForNavAndFooter();
  }

  /**
   * Mengambil data profil user yang sedang login.
   * @param userId ID user dari token JWT.
   */
  async getMyProfile(userId: number) {
    return this.usersService.findMe(userId);
  }

  /**
   * Mengupdate data profil user yang sedang login.
   * @param userId ID user dari token JWT.
   * @param dto Data baru untuk diupdate.
   */
  async updateMyProfile(userId: number, dto: UpdateMyProfileDto) {
    return this.usersService.updateMe(userId, dto);
  }
}