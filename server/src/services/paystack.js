import axios from 'axios';
import crypto from 'crypto';

const PAYSTACK_BASE = 'https://api.paystack.co';

function getPaystackClient() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || secret.includes('your_paystack')) {
    return null;
  }
  return axios.create({
    baseURL: PAYSTACK_BASE,
    headers: { Authorization: `Bearer ${secret}` },
  });
}

export async function initializePayment({ email, amount, reference, metadata }) {
  const client = getPaystackClient();

  if (!client) {
    return {
      mock: true,
      authorization_url: `${process.env.CLIENT_URL}/checkout/mock-pay?ref=${reference}`,
      access_code: `mock_${reference}`,
      reference,
    };
  }

  const { data } = await client.post('/transaction/initialize', {
    email,
    amount: Math.round(amount * 100),
    reference,
    callback_url: `${process.env.CLIENT_URL}/checkout/callback`,
    metadata,
  });

  if (!data.status) {
    throw new Error(data.message || 'Paystack initialization failed');
  }

  return data.data;
}

export async function verifyPayment(reference) {
  const client = getPaystackClient();

  if (!client) {
    return {
      mock: true,
      status: 'success',
      reference,
      amount: 0,
      paid_at: new Date().toISOString(),
    };
  }

  const { data } = await client.get(`/transaction/verify/${reference}`);

  if (!data.status) {
    throw new Error(data.message || 'Payment verification failed');
  }

  return data.data;
}

export function validatePaystackWebhookSignature(req) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || secret.includes('your_paystack')) return true;

  const hash = req.headers['x-paystack-signature'];
  if (!hash) return false;

  const computed = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  return computed === hash;
}
