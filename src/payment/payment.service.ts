import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';
import * as paypal from '@paypal/checkout-server-sdk';
import { OrderResponseDto } from '../orders/dto/order-response.dto';

interface PaymentConfig {
  serverKey?: string;
  clientKey?: string;
  clientId?: string;
  clientSecret?: string;
  mode?: 'sandbox' | 'production';
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  /**
   * MIDTRANS PAYMENT - Create Snap Transaction
   */
  async createMidtransTransaction(
    order: OrderResponseDto,
    config: PaymentConfig,
  ) {
    if (!config?.serverKey) {
      throw new InternalServerErrorException(
        'Midtrans Server Key is missing from config.',
      );
    }

    const isProduction = config.mode === 'production';
    const midtransUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const serverKey = config.serverKey;
    const authString = Buffer.from(`${serverKey}:`).toString('base64');

    const itemDetails = order.orderItems.map((item) => {
      const productName =
        (item.productName as any)?.en ||
        (item.productName as any)?.id ||
        'Product';
      return {
        id: `PROD-${item.id}`,
        price: Math.round(item.price),
        quantity: item.qty,
        name: productName.substring(0, 50),
      };
    });

    if (order.shippingCost > 0) {
      itemDetails.push({
        id: 'SHIPPING',
        price: Math.round(order.shippingCost),
        quantity: 1,
        name: 'Shipping Cost',
      });
    }

    const payload = {
      transaction_details: {
        // Format ini sudah benar dan menjadi "koneksi" ke webhook nanti
        order_id: `ORDER-${order.id}`,
        gross_amount: Math.round(order.total),
      },
      item_details: itemDetails,
      customer_details: {
        first_name: order.user.name.split(' ')[0],
        last_name:
          order.user.name.split(' ').slice(1).join(' ') ||
          order.user.name.split(' ')[0],
        email: order.user.email,
      },
      callbacks: {
        finish: `${process.env.FRONTEND_URL}/orders/${order.id}`,
      },
    };

    this.logger.log(
      `[Midtrans] Creating transaction for Order ID: ${payload.transaction_details.order_id}`,
    );

    try {
      const response = await axios.post(midtransUrl, payload, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${authString}`,
        },
      });

      this.logger.log(
        '[Midtrans] Successfully created transaction. Response:',
        JSON.stringify(response.data),
      );

      return {
        snapToken: response.data.token,
        redirectUrl: response.data.redirect_url,
      };
    } catch (err) {
      const errorData = err.response?.data;
      this.logger.error(
        '[Midtrans] Failed to create transaction:',
        errorData || err.message,
      );
      throw new InternalServerErrorException(
        errorData?.error_messages || 'Failed to create Midtrans transaction',
      );
    }
  }

  /**
   * PAYPAL PAYMENT - Create Checkout Session
   */
  async createPaypalTransaction(
    order: OrderResponseDto,
    config: PaymentConfig,
    currencyCode: string,
  ) {
    if (!config?.clientId || !config?.clientSecret) {
      throw new InternalServerErrorException('PayPal config is missing');
    }
    if (currencyCode !== 'USD') {
      throw new BadRequestException(
        'PayPal only supports USD currency for this setup.',
      );
    }

    const environment =
      config.mode === 'production'
        ? new paypal.core.LiveEnvironment(config.clientId, config.clientSecret)
        : new paypal.core.SandboxEnvironment(
            config.clientId,
            config.clientSecret,
          );

    const client = new paypal.core.PayPalHttpClient(environment);

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `ORDER-${order.id}`,
          amount: {
            currency_code: currencyCode,
            value: order.total.toFixed(2),
          },
        },
      ],
      application_context: {
        return_url:
          process.env.PAYPAL_RETURN_URL ||
          'http://localhost:3000/payment/success',
        cancel_url:
          process.env.PAYPAL_CANCEL_URL ||
          'http://localhost:3000/payment/cancel',
        brand_name: 'Your Shop Name',
        shipping_preference: 'NO_SHIPPING',
      },
    });

    try {
      const response = await client.execute(request);
      const approvalUrl = response.result.links.find(
        (l: any) => l.rel === 'approve',
      )?.href;
      if (!approvalUrl)
        throw new InternalServerErrorException('No PayPal approval URL found');
      return { approvalUrl };
    } catch (err) {
      this.logger.error('[PAYPAL] Failed to create order', err.message);
      throw new InternalServerErrorException('Failed to create PayPal transaction');
    }
  }
}