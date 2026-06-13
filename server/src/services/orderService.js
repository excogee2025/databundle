import prisma from '../lib/prisma.js';
import { initializePayment, verifyPayment } from './paystack.js';
import { purchaseBundle, detectNetwork, normalizePhone } from './telecom.js';
import { debitWallet, confirmWalletTopup } from './walletService.js';
import { getBundlePriceForAgent, processAgentCommission } from './commissionService.js';
import { notifyOrderUpdate } from './notificationService.js';
import { PERMISSIONS, hasPermission } from '../config/roles.js';

function generateOrderNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DB-${ts}-${rand}`;
}

async function resolvePrice(bundleId, agentId) {
  if (agentId) return getBundlePriceForAgent(bundleId, agentId);
  const bundle = await prisma.bundle.findUnique({ where: { id: bundleId } });
  return bundle?.price ?? 0;
}

export async function createOrder({
  bundleId,
  recipientPhone,
  userId,
  agentId,
  guestEmail,
  guestPhone,
  email,
  paymentSource = 'paystack',
}) {
  const bundle = await prisma.bundle.findUnique({
    where: { id: bundleId },
    include: { network: true },
  });

  if (!bundle || !bundle.active) {
    throw new Error('Bundle not found or unavailable');
  }

  const detected = detectNetwork(recipientPhone);
  if (detected && detected !== bundle.network.slug) {
    throw new Error(
      `Phone number appears to be ${detected.toUpperCase()}, but bundle is for ${bundle.network.name}`
    );
  }

  const price = await resolvePrice(bundleId, agentId);
  const orderNumber = generateOrderNumber();
  const paymentRef = `pay_${orderNumber.replace(/-/g, '_').toLowerCase()}`;

  if (paymentSource === 'wallet') {
    const payerId = agentId || userId;
    if (!payerId) throw new Error('Wallet payment requires authentication');

    await debitWallet(payerId, price, {
      type: 'purchase',
      description: `Bundle purchase ${orderNumber}`,
    });

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: userId || null,
        agentId: agentId || null,
        guestEmail: guestEmail || email,
        guestPhone,
        recipientPhone: normalizePhone(recipientPhone),
        networkSlug: bundle.network.slug,
        totalAmount: price,
        paymentSource: 'wallet',
        paymentRef,
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: 'wallet',
        items: {
          create: { bundleId: bundle.id, quantity: 1, unitPrice: price },
        },
      },
      include: {
        items: { include: { bundle: { include: { network: true } } } },
      },
    });

    if (userId) await notifyOrderUpdate(userId, order);

    const fulfilled = await fulfillOrder(order.id);
    return { order: fulfilled, payment: { wallet: true, reference: paymentRef } };
  }

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: userId || null,
      agentId: agentId || null,
      guestEmail: guestEmail || email,
      guestPhone,
      recipientPhone: normalizePhone(recipientPhone),
      networkSlug: bundle.network.slug,
      totalAmount: price,
      paymentSource: 'paystack',
      paymentRef,
      status: 'pending_payment',
      items: {
        create: { bundleId: bundle.id, quantity: 1, unitPrice: price },
      },
    },
    include: {
      items: { include: { bundle: { include: { network: true } } } },
    },
  });

  const paymentEmail = email || guestEmail || 'customer@databundle.gh';
  const payment = await initializePayment({
    email: paymentEmail,
    amount: price,
    reference: paymentRef,
    metadata: {
      order_id: order.id,
      order_number: orderNumber,
      bundle: bundle.name,
      recipient: recipientPhone,
    },
  });

  return { order, payment };
}

export async function createAgentSale({ agentId, agentRole, bundleId, recipientPhone, paymentSource }) {
  if (!hasPermission(agentRole, PERMISSIONS.SELL_BUNDLES)) {
    throw new Error('Your role cannot sell bundles');
  }

  return createOrder({
    bundleId,
    recipientPhone,
    agentId,
    paymentSource: paymentSource || 'wallet',
  });
}

export async function fulfillOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { bundle: { include: { network: true } } } },
    },
  });

  if (!order) throw new Error('Order not found');
  if (order.status === 'completed') return order;

  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'processing' },
  });

  const item = order.items[0];
  const result = await purchaseBundle({
    phone: order.recipientPhone,
    apiCode: item.bundle.apiCode,
    networkSlug: order.networkSlug,
    orderRef: order.orderNumber,
  });

  let updated;
  if (result.success) {
    updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'completed',
        telecomRef: result.reference,
        telecomStatus: 'delivered',
        fulfilledAt: new Date(),
      },
      include: {
        items: { include: { bundle: { include: { network: true } } } },
      },
    });

    if (order.agentId) await processAgentCommission(updated);
  } else {
    updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'failed',
        telecomRef: result.reference,
        telecomStatus: 'failed',
        failureReason: result.message,
      },
      include: {
        items: { include: { bundle: { include: { network: true } } } },
      },
    });
  }

  if (order.userId) await notifyOrderUpdate(order.userId, updated);
  return updated;
}

export async function handlePaymentSuccess(reference) {
  const walletTxn = await prisma.walletTransaction.findUnique({ where: { reference } });
  if (walletTxn?.type === 'topup_pending') {
    await confirmWalletTopup(reference);
    return { type: 'wallet_topup', reference };
  }

  const order = await prisma.order.findUnique({
    where: { paymentRef: reference },
    include: { items: { include: { bundle: true } } },
  });

  if (!order) throw new Error('Order not found for payment reference');
  if (order.status !== 'pending_payment') return order;

  const verification = await verifyPayment(reference);

  if (verification.status !== 'success' && !verification.mock) {
    throw new Error('Payment not successful');
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'paid',
      paidAt: new Date(),
      paymentMethod: verification.channel || 'paystack',
    },
  });

  await prisma.transaction.create({
    data: {
      orderId: order.id,
      type: 'payment',
      amount: order.totalAmount,
      reference,
      status: 'success',
      provider: verification.mock ? 'mock' : 'paystack',
      rawResponse: JSON.stringify(verification),
    },
  });

  if (order.userId) {
    await notifyOrderUpdate(order.userId, { ...order, status: 'paid' });
  }

  return fulfillOrder(order.id);
}

export async function retryFailedOrder(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');
  if (order.status !== 'failed') throw new Error('Only failed orders can be retried');
  if (!order.paidAt) throw new Error('Order was not paid');

  return fulfillOrder(orderId);
}
