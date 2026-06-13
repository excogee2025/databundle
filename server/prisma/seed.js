import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { ROLES, getCommissionRate, AGENT_ROLES } from '../src/config/roles.js';

dotenv.config();

const prisma = new PrismaClient();

const networks = [
  { name: 'MTN', slug: 'mtn', color: '#FFCC00' },
  { name: 'Telecel', slug: 'telecel', color: '#E4002B' },
  { name: 'AirtelTigo', slug: 'airteltigo', color: '#ED1C24' },
];

const bundleTemplates = {
  mtn: [
    { name: 'Daily 500MB', dataAmount: '500MB', validity: '1 Day', price: 3, costPrice: 2.5, apiCode: 'MTN_500MB_1D', popular: false },
    { name: 'Daily 1GB', dataAmount: '1GB', validity: '1 Day', price: 5, costPrice: 4.2, apiCode: 'MTN_1GB_1D', popular: true },
    { name: 'Weekly 2GB', dataAmount: '2GB', validity: '7 Days', price: 12, costPrice: 10, apiCode: 'MTN_2GB_7D', popular: false },
    { name: 'Weekly 5GB', dataAmount: '5GB', validity: '7 Days', price: 25, costPrice: 21, apiCode: 'MTN_5GB_7D', popular: true },
    { name: 'Monthly 10GB', dataAmount: '10GB', validity: '30 Days', price: 45, costPrice: 38, apiCode: 'MTN_10GB_30D', popular: true },
    { name: 'Monthly 20GB', dataAmount: '20GB', validity: '30 Days', price: 80, costPrice: 68, apiCode: 'MTN_20GB_30D', popular: false },
    { name: 'Monthly 50GB', dataAmount: '50GB', validity: '30 Days', price: 180, costPrice: 155, apiCode: 'MTN_50GB_30D', popular: false },
  ],
  telecel: [
    { name: 'Daily 500MB', dataAmount: '500MB', validity: '1 Day', price: 3, costPrice: 2.5, apiCode: 'VOD_500MB_1D', popular: false },
    { name: 'Daily 1GB', dataAmount: '1GB', validity: '1 Day', price: 5, costPrice: 4.2, apiCode: 'VOD_1GB_1D', popular: true },
    { name: 'Weekly 3GB', dataAmount: '3GB', validity: '7 Days', price: 15, costPrice: 12.5, apiCode: 'VOD_3GB_7D', popular: true },
    { name: 'Monthly 10GB', dataAmount: '10GB', validity: '30 Days', price: 42, costPrice: 36, apiCode: 'VOD_10GB_30D', popular: true },
    { name: 'Monthly 25GB', dataAmount: '25GB', validity: '30 Days', price: 95, costPrice: 82, apiCode: 'VOD_25GB_30D', popular: false },
  ],
  airteltigo: [
    { name: 'Daily 600MB', dataAmount: '600MB', validity: '1 Day', price: 3, costPrice: 2.5, apiCode: 'AT_600MB_1D', popular: false },
    { name: 'Daily 1.2GB', dataAmount: '1.2GB', validity: '1 Day', price: 5, costPrice: 4.2, apiCode: 'AT_1GB_1D', popular: true },
    { name: 'Weekly 4GB', dataAmount: '4GB', validity: '7 Days', price: 18, costPrice: 15, apiCode: 'AT_4GB_7D', popular: true },
    { name: 'Monthly 12GB', dataAmount: '12GB', validity: '30 Days', price: 48, costPrice: 40, apiCode: 'AT_12GB_30D', popular: true },
    { name: 'Monthly 30GB', dataAmount: '30GB', validity: '30 Days', price: 110, costPrice: 95, apiCode: 'AT_30GB_30D', popular: false },
  ],
};

async function upsertUser({ email, name, password, role, phone, parentAgentId, wallet = 0 }) {
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashed, role, name, phone, parentAgentId, wallet, commissionRate: getCommissionRate(role), gdprConsent: true, gdprConsentAt: new Date() },
    create: {
      email, name, password: hashed, role, phone, parentAgentId, wallet,
      commissionRate: getCommissionRate(role),
      gdprConsent: true,
      gdprConsentAt: new Date(),
      walletRecord: { create: { balance: wallet } },
    },
  });

  await prisma.wallet.upsert({
    where: { userId: user.id },
    update: { balance: wallet },
    create: { userId: user.id, balance: wallet },
  });

  if (AGENT_ROLES.includes(role)) {
    await prisma.agent.upsert({
      where: { userId: user.id },
      update: { level: role, commissionRate: getCommissionRate(role) },
      create: { userId: user.id, level: role, commissionRate: getCommissionRate(role) },
    });
  }

  return user;
}

async function linkAgentHierarchy(user, parentUser) {
  if (!parentUser || !AGENT_ROLES.includes(user.role)) return;

  const parentAgent = await prisma.agent.findUnique({ where: { userId: parentUser.id } });
  if (parentAgent) {
    await prisma.agent.update({
      where: { userId: user.id },
      data: { parentAgentId: parentAgent.id },
    });
  }
}

async function seedSampleOrders({ customerEmail, basicAgent, seniorAgent, superAgent }) {
  const customer = await prisma.user.findUnique({ where: { email: customerEmail } });
  const bundles = await prisma.bundle.findMany({ take: 6, include: { network: true } });
  if (!bundles.length || !customer) return;

  const existing = await prisma.order.count();
  if (existing > 0) return;

  const agents = [basicAgent, seniorAgent, superAgent];
  const hours = [9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20];
  let orderIdx = 0;

  for (let dayOffset = 60; dayOffset >= 0; dayOffset -= 2) {
    for (let i = 0; i < 2; i++) {
      const bundle = bundles[orderIdx % bundles.length];
      const agent = agents[orderIdx % agents.length];
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      date.setHours(hours[orderIdx % hours.length], 30, 0, 0);

      const orderNumber = `DB-SEED-${String(orderIdx).padStart(4, '0')}`;
      const amount = bundle.price;
      const commission = amount * getCommissionRate(agent.role);

      await prisma.order.create({
        data: {
          orderNumber,
          userId: orderIdx % 3 === 0 ? customer.id : null,
          agentId: agent.id,
          recipientPhone: `23324000000${orderIdx % 10}`,
          networkSlug: bundle.network.slug,
          totalAmount: amount,
          commissionAmount: commission,
          paymentSource: orderIdx % 2 === 0 ? 'wallet' : 'paystack',
          status: 'completed',
          paidAt: date,
          fulfilledAt: date,
          telecomRef: `MOCK-SEED-${orderNumber}`,
          telecomStatus: 'delivered',
          createdAt: date,
          items: {
            create: { bundleId: bundle.id, quantity: 1, unitPrice: amount },
          },
        },
      });
      orderIdx += 1;
    }
  }
  console.log(`Seeded ${orderIdx} sample orders for analytics`);
}

async function main() {
  console.log('Seeding PostgreSQL database...');

  for (const net of networks) {
    await prisma.network.upsert({
      where: { slug: net.slug },
      update: { name: net.name, color: net.color },
      create: net,
    });
  }

  for (const [slug, bundles] of Object.entries(bundleTemplates)) {
    const network = await prisma.network.findUnique({ where: { slug } });
    for (const b of bundles) {
      const data = { ...b, networkId: network.id, operator: network.name };
      const existing = await prisma.bundle.findFirst({
        where: { networkId: network.id, apiCode: b.apiCode },
      });
      if (existing) {
        await prisma.bundle.update({ where: { id: existing.id }, data });
      } else {
        await prisma.bundle.create({ data });
      }
    }
  }

  const admin = await upsertUser({
    email: process.env.ADMIN_EMAIL || 'admin@databundle.gh',
    name: 'Platform Admin',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
    role: ROLES.ADMIN,
    phone: '0240000000',
  });

  const superAgent = await upsertUser({
    email: 'super@databundle.gh',
    name: 'Super Agent',
    password: 'Agent@123456',
    role: ROLES.SUPER_AGENT,
    phone: '0241111111',
    wallet: 500,
  });

  const seniorAgent = await upsertUser({
    email: 'senior@databundle.gh',
    name: 'Senior Agent',
    password: 'Agent@123456',
    role: ROLES.SENIOR_AGENT,
    phone: '0242222222',
    parentAgentId: superAgent.id,
    wallet: 200,
  });

  const basicAgent = await upsertUser({
    email: 'agent@databundle.gh',
    name: 'Basic Agent',
    password: 'Agent@123456',
    role: ROLES.BASIC_AGENT,
    phone: '0243333333',
    parentAgentId: seniorAgent.id,
    wallet: 100,
  });

  await linkAgentHierarchy(seniorAgent, superAgent);
  await linkAgentHierarchy(basicAgent, seniorAgent);

  await upsertUser({
    email: 'customer@databundle.gh',
    name: 'Demo Customer',
    password: 'Customer@123',
    role: ROLES.CUSTOMER,
    phone: '0244444444',
    wallet: 50,
  });

  // Sample completed orders for analytics demo
  await seedSampleOrders({ customerEmail: 'customer@databundle.gh', basicAgent, seniorAgent, superAgent });

  console.log('Seed complete!');
  console.log('--- Demo Accounts ---');
  console.log(`Admin:    ${admin.email} / ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
  console.log('Super:    super@databundle.gh / Agent@123456');
  console.log('Senior:   senior@databundle.gh / Agent@123456');
  console.log('Basic:    agent@databundle.gh / Agent@123456');
  console.log('Customer: customer@databundle.gh / Customer@123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
