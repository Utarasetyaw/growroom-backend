// src/shipping-zone/entities/shipping-zone.entity.ts
import { ShippingZonePrice } from '@prisma/client';

export class ShippingZone {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  prices?: ShippingZonePrice[];
}
