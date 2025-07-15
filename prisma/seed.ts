// /prisma/seed.ts
import { PrismaClient } from '@prisma/client';

enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  USER = 'USER'
}
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // --- Hashing Password ---
  const saltRounds = 10;
  const password = await bcrypt.hash('password123', saltRounds);

  // --- 1. General Settings ---
  await prisma.generalSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      logoUrl: '/logo.png',
      faviconUrl: '/favicon.ico',
      shopDescription: 'Toko tanaman hias terbaik dengan koleksi paling unik dan terawat.',
      address: 'Jl. Raya Hijau No. 123, Jakarta, Indonesia',
      socialMedia: {
        instagram: 'https://instagram.com/glowroom',
        facebook: 'https://facebook.com/glowroom',
        twitter: 'https://twitter.com/glowroom',
      },
    },
  });
  console.log('✓ General Settings created.');

  // --- 2. Users ---
  const owner = await prisma.user.upsert({
    where: { email: 'owner@glowroom.com' },
    update: {},
    create: {
      email: 'owner@glowroom.com', name: 'Owner GlowRoom', password: password, role: Role.OWNER,
      permissions: ['finance', 'product', 'cs'],
    },
  });

  const adminProduct = await prisma.user.upsert({
    where: { email: 'admin-produk@glowroom.com' },
    update: {},
    create: {
      email: 'admin-produk@glowroom.com', name: 'Admin Produk', password: password, role: Role.ADMIN,
      permissions: ['product'],
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@gmail.com' },
    update: {},
    create: {
      email: 'user@gmail.com', name: 'Pelanggan Setia', password: password, role: Role.USER,
      permissions: [],
    },
  });
  console.log('✓ Users created.');

  // --- 3. Products & Product Images ---
  const product1 = await prisma.product.create({
    data: {
      name: 'Monstera Deliciosa', price: 675000, category: 'Indoor', subCategory: 'Daun Lebar', variant: 'Klasik',
      stock: 20, weight: 2.5, isBestProduct: true,
      careDetails: { "Humidity": "60-75%", "Watering": "Siram setiap 7-10 hari", "Light": "Indirect sunlight" },
      images: {
        create: [
          { url: 'https://images.pexels.com/photos/6208086/pexels-photo-6208086.jpeg?auto=compress&cs=tinysrgb&w=800' },
          { url: 'https://images.pexels.com/photos/1671650/pexels-photo-1671650.jpeg?auto=compress&cs=tinysrgb&w=800' },
        ],
      },
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Anthurium Veitchii', price: 1250000, category: 'Kolektor', subCategory: 'Daun Unik', variant: 'King Anthurium',
      stock: 5, weight: 1.8, isBestProduct: true,
      careDetails: { "Humidity": "70-80%", "Watering": "Jaga media tetap lembab", "Light": "Low to medium light" },
      images: {
        create: [
          { url: 'https://images.pexels.com/photos/807598/pexels-photo-807598.jpeg?auto=compress&cs=tinysrgb&w=800' },
        ],
      },
    },
  });
  console.log('✓ Products and Images created.');

  // --- 4. Settings (Payment, Language, Currency, Shipping) ---
  await prisma.paymentMethod.createMany({
    data: [
      { name: 'Midtrans', code: 'midtrans', isActive: true, config: { "serverKey": "YOUR_SERVER_KEY", "clientKey": "YOUR_CLIENT_KEY" } },
      { name: 'PayPal', code: 'paypal', isActive: false, config: { "clientId": "YOUR_CLIENT_ID" } },
      { name: 'Bank Transfer', code: 'bank_transfer', isActive: true, config: { "bank": "BCA", "accountNumber": "1234567890", "accountHolder": "GlowRoom ID" } },
    ],
    skipDuplicates: true,
  });

  await prisma.language.createMany({
    data: [
      { name: 'Indonesia', code: 'id', isActive: true, isDefault: true },
      { name: 'English', code: 'en', isActive: true, isDefault: false },
      { name: 'Japanese', code: 'ja', isActive: false, isDefault: false },
    ],
    skipDuplicates: true,
  });

  await prisma.currency.createMany({
    data: [
      { name: 'Indonesian Rupiah', code: 'IDR', symbol: 'Rp', isActive: true, isDefault: true },
      { name: 'US Dollar', code: 'USD', symbol: '$', isActive: true, isDefault: false },
    ],
    skipDuplicates: true,
  });

  await prisma.shippingProvider.create({
    data: { name: 'RajaOngkir', code: 'rajaongkir', isActive: true, credentials: { "apiKey": "YOUR_RAJAONGKIR_API_KEY" } },
  });
  console.log('✓ Settings (Payment, Language, etc) created.');

  // --- 5. Shipping Zones & Rates ---
  const zoneIndonesia = await prisma.shippingZone.create({
    data: {
      name: 'Indonesia',
      isActive: true,
      rates: {
        create: [
          { city: 'Jabodetabek', price: 25000 },
          { city: 'Pulau Jawa', price: 50000 },
          { city: 'Luar Pulau Jawa', price: 100000 },
        ],
      },
    },
  });
  console.log('✓ Shipping Zones and Rates created.');
  
  // --- 6. Chat ---
  const conversation = await prisma.conversation.create({
    data: {
      user: { connect: { id: regularUser.id } },
      assignedTo: { connect: { id: adminProduct.id } },
      status: 'OPEN',
      messages: {
        create: [
          { content: 'Halo, apakah anthurium veitchii masih tersedia?', senderId: regularUser.id },
          { content: 'Halo, kak. Masih tersedia 5 pot. Silakan diorder :)', senderId: adminProduct.id },
        ]
      }
    }
  });
  console.log('✓ Chat Conversation created.');

  console.log('🌱 Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });