import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AboutItemDto {
  @ApiProperty({
    description: 'Judul item dalam berbagai bahasa.',
    example: { id: 'Visi Kami', en: 'Our Vision' },
  })
  title: any;

  @ApiProperty({
    description: 'Deskripsi item dalam berbagai bahasa.',
    example: { id: 'Menjadi platform terdepan...', en: 'To be the leading platform...' },
  })
  description: any;
}

class FaqDto {
  @ApiProperty({
    description: 'Pertanyaan dalam berbagai bahasa.',
    example: { id: 'Bagaimana cara melacak pesanan?', en: 'How to track my order?' },
  })
  question: any;

  @ApiProperty({
    description: 'Jawaban dalam berbagai bahasa.',
    example: { id: 'Anda dapat melacak pesanan melalui halaman...', en: 'You can track your order via the page...' },
  })
  answer: any;
}

class ShippingPolicyItemDto {
  @ApiProperty({
    description: 'Judul kebijakan dalam berbagai bahasa.',
    example: { en: 'Standard Shipping', id: 'Pengiriman Standar' },
  })
  title: any;

  @ApiProperty({
    description: 'Deskripsi kebijakan dalam berbagai bahasa.',
    example: { en: 'Estimate 3-5 business days...', id: 'Estimasi 3-5 hari kerja...' },
  })
  description: any;
}

export class GeneralSettingResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ example: '/uploads/generalsetting/logo.png', nullable: true })
  logoUrl: string | null;

  @ApiProperty({ example: '/uploads/generalsetting/favicon.ico', nullable: true })
  faviconUrl: string | null;

  @ApiProperty({ example: '/uploads/generalsetting/banner.jpg', nullable: true })
  bannerImageUrl: string | null;

  @ApiProperty({ example: '/uploads/generalsetting/banner.mp4', nullable: true })
  bannerVideoUrl: string | null;

  @ApiProperty({
    description: 'Nama toko dalam berbagai bahasa.',
    example: { id: 'Toko Keren', en: 'Cool Store' },
  })
  shopName: any;

  @ApiProperty({
    description: 'Deskripsi toko dalam berbagai bahasa.',
    example: { id: 'Deskripsi singkat tentang toko...', en: 'A brief description of the store...' },
  })
  shopDescription: any;

  @ApiProperty({ example: 'Jl. Jenderal Sudirman No. 1, Jakarta', nullable: true })
  address: string | null;

  @ApiPropertyOptional({
    description: 'Alamat email kontak utama.',
    example: 'support@tokokeren.com',
    nullable: true,
  })
  email: string | null;

  @ApiPropertyOptional({
    description: 'Nomor telepon kontak utama.',
    example: '+628123456789',
    nullable: true,
  })
  phoneNumber: string | null;

  @ApiProperty({
    description: 'Link media sosial.',
    example: {
      instagram: 'https://instagram.com/tokokeren',
      facebook: 'https://facebook.com/tokokeren',
      tiktok: 'https://tiktok.com/@tokokeren',
      youtube: 'https://youtube.com/c/tokokeren',
      telegram: 'https://t.me/tokokeren',
    },
  })
  socialMedia: any;

  @ApiPropertyOptional({
    description: 'Array objek untuk Visi, Misi, dan Nilai.',
    type: [AboutItemDto],
  })
  aboutItems: AboutItemDto[];

  @ApiPropertyOptional({
    description: 'Array objek untuk Pertanyaan yang Sering Diajukan (FAQ).',
    type: [FaqDto],
  })
  faqs: FaqDto[];

  @ApiPropertyOptional({
    description: 'Array objek untuk Kebijakan Pengiriman.',
    type: [ShippingPolicyItemDto],
  })
  shippingPolicy: ShippingPolicyItemDto[];

  @ApiProperty({ nullable: true })
  telegramBotToken: string | null;

  @ApiProperty({ nullable: true })
  telegramChatId: string | null;
}