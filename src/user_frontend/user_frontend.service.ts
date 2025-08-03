import { Injectable } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { GeneralsettingService } from '../generalsetting/generalsetting.service';
import { ProductsService } from '../products/products.service';
import { TestimonialsService } from '../testimonials/testimonials.service';

@Injectable()
export class UserFrontendService {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly productsService: ProductsService,
    private readonly testimonialsService: TestimonialsService,
    private readonly generalsettingService: GeneralsettingService,
  ) {}

  /**
   * Mengambil dan menggabungkan semua data yang diperlukan untuk halaman utama.
   * Fungsi ini memanggil beberapa service secara bersamaan untuk efisiensi.
   * @returns {Promise<object>} Sebuah objek yang berisi data untuk:
   * - categories: Daftar semua kategori.
   * - bestProducts: Produk-produk unggulan atau terbaru.
   * - testimonials: Daftar semua testimoni.
   * - generalSettings: Pengaturan umum situs yang relevan untuk homepage.
   */
  async getHomepageData() {
    // Menjalankan semua promise secara bersamaan untuk mempercepat waktu respons
    const [categories, bestProducts, testimonials, generalSettings] =
      await Promise.all([
        this.categoriesService.findAll(),
        this.productsService.findBestProducts(8), // Mengambil 8 produk unggulan/terbaru
        this.testimonialsService.findAll(),
        this.generalsettingService.findForHomepage(),
      ]);

    // Mengembalikan semua data dalam satu objek terstruktur
    return {
      categories,
      bestProducts,
      testimonials,
      generalSettings,
    };
  }

  // Anda dapat menambahkan metode lain di sini untuk halaman lain,
  // misalnya getProductListPageData, getAboutPageData, dll.
}