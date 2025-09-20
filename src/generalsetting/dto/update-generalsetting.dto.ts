import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGeneralsettingDto {
  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'File gambar untuk logo baru.' })
  logoUrl?: any;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'File gambar untuk favicon baru.' })
  faviconUrl?: any;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'File gambar untuk banner baru.' })
  bannerImageUrl?: any;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'File video untuk banner baru.' })
  bannerVideoUrl?: any;

  @ApiPropertyOptional({ 
    type: 'string', 
    description: 'Nama toko dalam format JSON string. Cth: \'{"id":"Toko Baru","en":"New Store"}\'' 
  })
  shopName?: string;

  @ApiPropertyOptional({ 
    type: 'string', 
    description: 'Deskripsi toko dalam format JSON string.' 
  })
  shopDescription?: string;

  @ApiPropertyOptional({ 
    type: 'string', 
    description: 'Alamat lengkap toko.' 
  })
  address?: string;

  @ApiPropertyOptional({ 
    type: 'string', 
    description: 'Alamat email kontak.' 
  })
  email?: string;

  @ApiPropertyOptional({ 
    type: 'string', 
    description: 'Nomor telepon kontak.' 
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    type: 'string',
    description: 'Media sosial dalam format JSON string.',
    example: '{"instagram":"https://...","facebook":"https://...","tiktok":"https://...","youtube":"https://...","telegram":"https://..."}',
  })
  socialMedia?: string;

  @ApiPropertyOptional({
    type: 'string',
    description: 'Array Visi, Misi, Nilai dalam format JSON string.',
    example: '[{"title":{"id":"Visi"},"description":{"id":"Menjadi..."}}]',
  })
  aboutItems?: string;

  @ApiPropertyOptional({
    type: 'string',
    description: 'Array FAQ dalam format JSON string.',
    example: '[{"question":{"id":"Apa itu?"},"answer":{"id":"Ini adalah..."}}]',
  })
  faqs?: string;

  @ApiPropertyOptional({
    type: 'string',
    description: 'Array Kebijakan Pengiriman dalam format JSON string.',
    example: '[{"title":{"en":"Standard Shipping"},"description":{"en":"Estimate 3-5 days..."}}]',
  })
  shippingPolicy?: string;

  @ApiPropertyOptional({ type: 'string' })
  telegramBotToken?: string;

  @ApiPropertyOptional({ type: 'string' })
  telegramChatId?: string;
}