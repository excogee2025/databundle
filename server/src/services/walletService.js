import prisma from '../lib/prisma.js';
import { v4 as uuidv4 } from 'uuid';
import { initializePayment } from './paystack.js';
import { createNotification } from './notificationService.js';

function ref(prefix) {
  return `${prefix}_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
}

export async function getWalletBalance(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { wallet: true } });
  return user?.wallet ?? 0;
}

export async function getWalletHistory(userId) {
  return prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function creditWallet(userId, amount, { type, description }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const balanceAfter = user.wallet + amount;
  await prisma.user.update({ where: { id: userId }, data: { wallet: balanceAfter } });

  return prisma.walletTransaction.create({
    data: {
      userId,
      type,
      amount,
      balanceAfter,
      reference: ref('wlt'),
      description,
      status: 'completed',
    },
  });
}

export async function debitWallet(userId, amount, { type, description }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  if (user.wallet < amount) throw new Error('Insufficient wallet balance');

  const balanceAfter = user.wallet - amount;
  await prisma.user.update({ where: { id: userId }, data: { wallet: balanceAfter } });

  return prisma.walletTransaction.create({
    data: {
      userId,
      type,
      amount: -amount,
      balanceAfter,
      reference: ref('wlt'),
      description,
      status: 'completed',
    },
  });
}

export async function initiateWalletTopup(userId, amount, email) {
  if (amount < 1) throw new Error('Minimum top-up is GH₵ 1');

  const reference = ref('topup');
  const payment = await initializePayment({
    email,
    amount,
    reference,
    metadata: { type: 'wallet_topup', user_id: userId },
  });

  await prisma.walletTransaction.create({
    data: {
      userId,
      type: 'topup_pending',
      amount,
      balanceAfter: (await getWalletBalance(userId)),
      reference,
      description: 'Wallet top-up pending',
      status: 'pending',
    },
  });

  return { payment, reference };
}

export async function confirmWalletTopup(reference) {
  const txn = await prisma.walletTransaction.findUnique({ where: { reference } });
  if (!txn || txn.status !== 'pending') return null;

  await creditWallet(txn.userId, txn.amount, {
    type: 'topup',
    description: 'Wallet top-up via Paystack',
  });

  await prisma.walletTransaction.update({
    where: { reference },
    data: { status: 'completed', description: 'Wallet top-up completed' },
  });

  await createNotification(txn.userId, {
    title: 'Wallet Topped Up',
    message: `GH₵ ${txn.amount.toFixed(2)} added to your wallet.`,
    type: 'success',
    link: '/wallet',
  });

  return txn;
}
