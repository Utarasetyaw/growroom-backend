import { ApiProperty } from '@nestjs/swagger';

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
    example: { id: 'Deskripsi toko...', en: 'Store description...' },
  })
  shopDescription: any;

  @ApiProperty({ example: 'Jl. Merdeka No. 17', nullable: true })
  address: string | null;

  @ApiProperty({
    description: 'Link media sosial.',
    example: { facebook: 'https://fb.com/user', instagram: 'https://ig.com/user' },
  })
  socialMedia: any;

  @ApiProperty({ nullable: true })
  telegramBotToken: string | null;

  @ApiProperty({ nullable: true })
  telegramChatId: string | null;
}