-- Tambahkan kolom price, awalnya nullable dulu (tanpa NOT NULL)
ALTER TABLE "ShippingZone" ADD COLUMN "price" DOUBLE PRECISION;

-- Isi semua data lama dengan value default (misal 35000)
UPDATE "ShippingZone" SET "price" = 35000 WHERE "price" IS NULL;

-- Lalu baru set kolom price jadi NOT NULL dan (optional) default
ALTER TABLE "ShippingZone" ALTER COLUMN "price" SET NOT NULL;
ALTER TABLE "ShippingZone" ALTER COLUMN "price" SET DEFAULT 0;  -- (opsional)
