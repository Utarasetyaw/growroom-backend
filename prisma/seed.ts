import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  USER = 'USER'
}

async function main() {
  console.log('🌱 Start seeding...');

  // Hashing Password
  const saltRounds = 10;
  const password = await bcrypt.hash('password123', saltRounds);

  // 1. General Setting
  await prisma.generalSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      logoUrl: '/logo.png',
      faviconUrl: '/favicon.ico',
      shopDescription: { id: 'Deskripsi GlowRoom', en: 'Best plant shop', ja: '最高の植物ショップ' },
      address: 'Jl. Raya Hijau No. 123, Jakarta, Indonesia',
      socialMedia: {
        instagram: 'https://instagram.com/glowroom',
        facebook: 'https://facebook.com/glowroom',
        twitter: 'https://twitter.com/glowroom',
      },
      shopName: { id: 'GlowRoom', en: 'GlowRoom', ja: 'グロウルーム' }
    },
  });
  console.log('✓ General Setting created.');

  // 2. Users
  const owner = await prisma.user.upsert({
    where: { email: 'owner@glowroom.com' },
    update: {},
    create: {
      email: 'owner@glowroom.com',
      name: 'Owner GlowRoom',
      password,
      role: Role.OWNER,
      permissions: ['finance', 'product', 'cs'],
    },
  });

  const adminProduct = await prisma.user.upsert({
    where: { email: 'admin-produk@glowroom.com' },
    update: {},
    create: {
      email: 'admin-produk@glowroom.com',
      name: 'Admin Produk',
      password,
      role: Role.ADMIN,
      permissions: ['product'],
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@gmail.com' },
    update: {},
    create: {
      email: 'user@gmail.com',
      name: 'Pelanggan Setia',
      password,
      role: Role.USER,
      permissions: [],
    },
  });
  console.log('✓ Users created.');

  // 3. Currency
  const idr = await prisma.currency.create({
    data: { name: 'Indonesian Rupiah', code: 'IDR', symbol: 'Rp', isActive: true, isDefault: true },
  });
  const usd = await prisma.currency.create({
    data: { name: 'US Dollar', code: 'USD', symbol: '$', isActive: true, isDefault: false },
  });

  // 4. Category/SubCategory
  const indoor = await prisma.category.create({
    data: { name: { id: 'Indoor', en: 'Indoor', ja: 'インドア' } }
  });
  const kolektor = await prisma.category.create({
    data: { name: { id: 'Kolektor', en: 'Collector', ja: 'コレクター' } }
  });

  const daunLebar = await prisma.subCategory.create({
    data: { name: { id: 'Daun Lebar', en: 'Wide Leaf', ja: '広い葉' }, category: { connect: { id: indoor.id } } }
  });
  const daunUnik = await prisma.subCategory.create({
    data: { name: { id: 'Daun Unik', en: 'Unique Leaf', ja: 'ユニークな葉' }, category: { connect: { id: kolektor.id } } }
  });

  // 5. Product + Multi Currency
  const product1 = await prisma.product.create({
    data: {
      name: { id: 'Monstera Deliciosa', en: 'Monstera Deliciosa', ja: 'モンステラ・デリシオサ' },
      variant: 'Klasik',
      stock: 20,
      weight: 2.5,
      isBestProduct: true,
      isActive: true,
      careDetails: { id: 'Siram tiap 7 hari', en: 'Water every 7 days' },
      subCategory: { connect: { id: daunLebar.id } },
      images: {
        create: [
          { url: 'https://images.pexels.com/photos/6208086/pexels-photo-6208086.jpeg?auto=compress&cs=tinysrgb&w=800' },
        ],
      },
      prices: {
        create: [
          { currencyId: idr.id, price: 675000 },
          { currencyId: usd.id, price: 50 }
        ]
      }
    },
  });

  // 6. ShippingZone & Rate Multi Currency
  const shippingZone = await prisma.shippingZone.create({
    data: {
      name: 'Indonesia',
      isActive: true,
      prices: {
        create: [
          { currencyId: idr.id, price: 35000 },
          { currencyId: usd.id, price: 3 }
        ]
      },
      rates: {
        create: [
          {
            city: 'Jabodetabek',
            isActive: true,
            prices: {
              create: [
                { currencyId: idr.id, price: 25000 },
                { currencyId: usd.id, price: 2 }
              ]
            }
          },
        ]
      }
    }
  });

  // dst...
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
