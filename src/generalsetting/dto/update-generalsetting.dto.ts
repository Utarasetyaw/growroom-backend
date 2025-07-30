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

  @ApiPropertyOptional({ type: 'string', description: 'Nama toko dalam format JSON string. Cth: \'{"id":"Toko Baru"}\'' })
  shopName?: string;

  @ApiPropertyOptional({ type: 'string', description: 'Deskripsi toko dalam format JSON string.' })
  shopDescription?: string;

  @ApiPropertyOptional({ type: 'string' })
  address?: string;

  @ApiPropertyOptional({ type: 'string', description: 'Media sosial dalam format JSON string.' })
  socialMedia?: string;

  @ApiPropertyOptional({ type: 'string' })
  telegramBotToken?: string;

  @ApiPropertyOptional({ type: 'string' })
  telegramChatId?: string;
}