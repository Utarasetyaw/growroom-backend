import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import * as midtransClient from 'midtrans-client';
import * as paypal from '@paypal/checkout-server-sdk';
import { OrderResponseDto } from '../orders/dto/order-response.dto'; // Impor DTO untuk type-safety

// Definisikan tipe untuk config agar lebih aman
interface PaymentConfig {
  serverKey?: string;
  clientKey?: string;
  clientId?: string;
  clientSecret?: string;
  mode?: 'sandbox' | 'production'; // Mode bisa sandbox atau production
}

@Injectable()
export class PaymentService {
  /**
   * MIDTRANS PAYMENT - Create Snap Transaction
   */
  async createMidtransTransaction(order: OrderResponseDto, config: PaymentConfig) {
    if (!config?.serverKey || !config?.clientKey) {
      throw new InternalServerErrorException('Midtrans config is missing');
    }

    // --- REVISI 1: Mode produksi/sandbox diambil dari config, bukan hardcode ---
    const isProduction = config.mode === 'production';

    const snap = new midtransClient.Snap({
      isProduction,
      serverKey: config.serverKey,
      clientKey: config.clientKey,
    });

    const order_id = `ORDER-${order.id}-${Date.now()}`;
    const parameter = {
      transaction_details: {
        order_id,
        gross_amount: order.total,
      },
      customer_details: {
        email: order.user?.email,
        first_name: order.user?.name,
      },
      item_details: order.orderItems.map(item => {
        // --- REVISI 2: Mengambil nama produk dari snapshot yang lebih andal ---
        const productName = (item.product?.name as any)?.en || (item.product?.name as any)?.id || 'Product';
        return {
            id: String(item.id), // Gunakan ID OrderItem agar unik
            price: item.price,
            quantity: item.qty,
            name: productName.substring(0, 50), // Midtrans punya batas 50 karakter
        }
      }),
    };

    try {
      const snapResponse = await snap.createTransaction(parameter);
      return {
        snapToken: snapResponse.token,
        redirectUrl: snapResponse.redirect_url,
      };
    } catch (err) {
      console.error('[MIDTRANS] Failed to create transaction', err.message);
      throw new InternalServerErrorException('Failed to create Midtrans transaction');
    }
  }

  /**
   * PAYPAL PAYMENT - Create Checkout Session
   */
  // --- REVISI 3: Tambahkan parameter `currencyCode` agar tidak bergantung pada data order ---
  async createPaypalTransaction(order: OrderResponseDto, config: PaymentConfig, currencyCode: string) {
    if (!config?.clientId || !config?.clientSecret) {
      throw new InternalServerErrorException('PayPal config is missing');
    }
    if (currencyCode !== 'USD') {
        throw new BadRequestException('PayPal only supports USD currency for this setup.');
    }

    // --- REVISI 4: Gunakan environment yang sesuai dari config ---
    const environment = config.mode === 'production'
      ? new paypal.core.LiveEnvironment(config.clientId, config.clientSecret)
      : new paypal.core.SandboxEnvironment(config.clientId, config.clientSecret);
    
    const client = new paypal.core.PayPalHttpClient(environment);

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `ORDER-${order.id}`,
          amount: {
            currency_code: currencyCode, // Gunakan currencyCode dari parameter
            // --- REVISI 5: Pastikan nilai memiliki 2 angka desimal ---
            value: order.total.toFixed(2),
          },
        },
      ],
      application_context: {
        // --- REVISI 6: Ambil URL dari environment variable, jangan hardcode ---
        return_url: process.env.PAYPAL_RETURN_URL || 'http://localhost:3000/payment/success',
        cancel_url: process.env.PAYPAL_CANCEL_URL || 'http://localhost:3000/payment/cancel',
        brand_name: 'Your Shop Name', // Ganti dengan nama toko Anda
        shipping_preference: 'NO_SHIPPING', // Karena alamat sudah di-handle di sistem Anda
      },
    });

    try {
      const response = await client.execute(request);
      const approvalUrl = response.result.links.find((l: any) => l.rel === 'approve')?.href;
      if (!approvalUrl) throw new InternalServerErrorException('No PayPal approval URL found');
      return { approvalUrl };
    } catch (err) {
      console.error('[PAYPAL] Failed to create order', err.message);
      throw new InternalServerErrorException('Failed to create PayPal transaction');
    }
  }
}