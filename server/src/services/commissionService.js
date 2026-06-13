import prisma from '../lib/prisma.js';
import { getCommissionRate, isAgent } from '../config/roles.js';
import { creditWallet } from './walletService.js';
import { createNotification } from './notificationService.js';

export async function getBundlePriceForAgent(bundleId, agentId) {
  const custom = await prisma.agentPricing.findUnique({
    where: { agentId_bundleId: { agentId, bundleId } },
  });
  if (custom) return custom.customPrice;

  const bundle = await prisma.bundle.findUnique({ where: { id: bundleId } });
  return bundle?.price ?? 0;
}

export async function processAgentCommission(order) {
  if (!order.agentId) return null;

  const agent = await prisma.user.findUnique({ where: { id: order.agentId } });
  if (!agent || !isAgent(agent.role)) return null;

  const rate = agent.commissionRate ?? getCommissionRate(agent.role);
  const amount = order.totalAmount * rate;

  const commission = await prisma.commission.create({
    data: {
      agentId: agent.id,
      orderId: order.id,
      amount,
      rate,
      status: 'paid',
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { commissionAmount: amount },
  });

  await creditWallet(agent.id, amount, {
    type: 'commission',
    description: `Commission for order ${order.orderNumber}`,
  });

  await createNotification(agent.id, {
    title: 'Commission Earned',
    message: `You earned GH₵ ${amount.toFixed(2)} from order ${order.orderNumber}.`,
    type: 'success',
    link: '/agent',
  });

  return commission;
}

export async function getAgentCommissions(agentId) {
  return prisma.commission.findMany({
    where: { agentId },
    include: {
      order: {
        select: { orderNumber: true, totalAmount: true, recipientPhone: true, status: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function getAgentSalesStats(agentId, subAgentIds = []) {
  const agentIds = [agentId, ...subAgentIds];

  const [totalSales, completedSales, revenue, commissions] = await Promise.all([
    prisma.order.count({ where: { agentId: { in: agentIds } } }),
    prisma.order.count({ where: { agentId: { in: agentIds }, status: 'completed' } }),
    prisma.order.aggregate({
      where: { agentId: { in: agentIds }, status: 'completed' },
      _sum: { totalAmount: true },
    }),
    prisma.commission.aggregate({
      where: { agentId: { in: agentIds } },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalSales,
    completedSales,
    revenue: revenue._sum.totalAmount || 0,
    totalCommissions: commissions._sum.amount || 0,
    successRate: totalSales ? ((completedSales / totalSales) * 100).toFixed(1) : 0,
  };
}

async function getSubAgentIdsRecursive(agentId) {
  const direct = await prisma.user.findMany({
    where: { parentAgentId: agentId },
    select: { id: true },
  });

  let ids = direct.map((a) => a.id);
  for (const sub of direct) {
    const nested = await getSubAgentIdsRecursive(sub.id);
    ids = ids.concat(nested);
  }
  return ids;
}

export async function getAgentHierarchyIds(agentId) {
  return getSubAgentIdsRecursive(agentId);
}
