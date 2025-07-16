import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as midtransClient from 'midtrans-client';
import * as paypal from '@paypal/checkout-server-sdk';

@Injectable()
export class PaymentService {
  /**
   * MIDTRANS PAYMENT - Create Snap Transaction
   */
  async createMidtransTransaction(order: any, config: any) {
    if (!config?.serverKey || !config?.clientKey) {
      throw new InternalServerErrorException('Midtrans config missing');
    }

    const snap = new midtransClient.Snap({
      isProduction: false, // Ganti true untuk produksi!
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
        email: order.user?.email || undefined,
        first_name: order.user?.name || undefined,
      },
      item_details: Array.isArray(order.orderItems)
        ? order.orderItems.map(item => ({
            id: String(item.productId),
            price: item.price,
            quantity: item.qty,
            name: typeof item.product?.name === 'object' ? item.product.name.id : (item.product?.name || 'Product'),
          }))
        : [],
    };

    try {
      const snapResponse = await snap.createTransaction(parameter);
      // { token, redirect_url }
      return {
        snapToken: snapResponse.token,
        redirectUrl: snapResponse.redirect_url,
      };
    } catch (err) {
      console.error('[MIDTRANS] Failed to create transaction', err);
      throw new InternalServerErrorException('Failed to create Midtrans transaction');
    }
  }

  /**
   * PAYPAL PAYMENT - Create Checkout Session
   */
  async createPaypalTransaction(order: any, config: any) {
    if (!config?.clientId || !config?.clientSecret) {
      throw new InternalServerErrorException('PayPal config missing');
    }

    const environment = new paypal.core.SandboxEnvironment(config.clientId, config.clientSecret);
    const client = new paypal.core.PayPalHttpClient(environment);

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `ORDER-${order.id}`,
          amount: {
            currency_code: order.currencyCode || 'USD',
            value: order.total.toString(),
          },
        },
      ],
      application_context: {
        return_url: 'https://your-frontend.com/paypal/success', // Ubah ke FE-mu
        cancel_url: 'https://your-frontend.com/paypal/cancel',
      },
    });

    try {
      const response = await client.execute(request);
      const approvalUrl = response.result.links.find((l: any) => l.rel === 'approve')?.href;
      if (!approvalUrl) throw new Error('No approval URL found');
      return { approvalUrl };
    } catch (err) {
      console.error('[PAYPAL] Failed to create order', err);
      throw new InternalServerErrorException('Failed to create PayPal transaction');
    }
  }
}
