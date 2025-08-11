import { Injectable, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as paypal from '@paypal/checkout-server-sdk';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaypalService {
  private readonly logger = new Logger(PaypalService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Meng-handle notifikasi webhook dari PayPal
   * @param headers Header dari request webhook
   * @param body Body dari request webhook
   */
  async handleWebhook(headers: any, body: any) {
    this.logger.log('PayPal webhook received.');
    this.logger.debug('Payload:', JSON.stringify(body, null, 2));

    const orderIdString = body.resource?.purchase_units[0]?.reference_id?.replace('ORDER-', '');
    const orderId = parseInt(orderIdString, 10);

    if (isNaN(orderId)) {
      throw new BadRequestException('Invalid reference_id in webhook payload.');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { paymentMethod: true },
    });

    if (!order) {
      this.logger.warn(`Order #${orderId} not found for PayPal webhook. Acknowledging.`);
      return { message: `Order #${orderId} not found, but acknowledged.` };
    }

    if (order.paymentMethod?.code !== 'paypal') {
        this.logger.warn(`Order #${orderId} was not a PayPal order. Ignoring.`);
        return;
    }

    const config = order.paymentMethod.config as any;
    const environment = config.mode === 'production'
        ? new paypal.core.LiveEnvironment(config.clientId, config.clientSecret)
        : new paypal.core.SandboxEnvironment(config.clientId, config.clientSecret);
    const client = new paypal.core.PayPalHttpClient(environment);

    // 1. Verifikasi Keaslian Webhook
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
        throw new InternalServerErrorException('PAYPAL_WEBHOOK_ID is not set.');
    }

    const request = new paypal.webhooks.WebhooksVerifySignatureRequest();
    request.requestBody({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: body,
    });

    try {
      const verification = await client.execute(request);
      if (verification.result.verification_status !== 'SUCCESS') {
        this.logger.error('PayPal webhook verification failed.');
        throw new BadRequestException('Webhook signature verification failed.');
      }
      this.logger.log('PayPal webhook signature verified.');
    } catch (err) {
      this.logger.error('Error verifying PayPal webhook:', err.message);
      throw new InternalServerErrorException('Could not verify webhook.');
    }

    // 2. Proses Event 'CHECKOUT.ORDER.APPROVED'
    if (body.event_type === 'CHECKOUT.ORDER.APPROVED') {
      if (order.paymentStatus === 'PENDING') {
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            // Order status tetap PROCESSING, menunggu tindakan admin
          },
        });
        this.logger.log(`SUCCESS: Order #${orderId} payment status updated to PAID.`);
      } else {
        this.logger.log(`Order #${orderId} status was already ${order.paymentStatus}. No update needed.`);
      }
    } else {
        this.logger.log(`Unhandled PayPal event type: ${body.event_type}`);
    }

    return { message: 'PayPal webhook processed successfully.' };
  }
}