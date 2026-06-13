import axios from 'axios';

const NETWORK_PREFIXES = {
  mtn: ['024', '025', '053', '054', '055', '059'],
  telecel: ['020', '050'],
  airteltigo: ['027', '057', '026', '056'],
};

export function detectNetwork(phone) {
  const cleaned = phone.replace(/\D/g, '');
  const local = cleaned.startsWith('233') ? '0' + cleaned.slice(3) : cleaned;
  const prefix = local.slice(0, 3);

  for (const [slug, prefixes] of Object.entries(NETWORK_PREFIXES)) {
    if (prefixes.includes(prefix)) return slug;
  }
  return null;
}

export function normalizePhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('233')) return cleaned;
  if (cleaned.startsWith('0')) return '233' + cleaned.slice(1);
  return '233' + cleaned;
}

function getTelecomClient() {
  const baseURL = process.env.TELECOM_API_URL;
  const apiKey = process.env.TELECOM_API_KEY;

  if (!baseURL || !apiKey || apiKey.includes('your_telecom')) {
    return null;
  }

  return axios.create({
    baseURL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
}

async function mockPurchaseBundle({ phone, apiCode, networkSlug, orderRef }) {
  await new Promise((r) => setTimeout(r, 1500 + Math.random() * 2000));

  const failRate = 0.05;
  if (Math.random() < failRate) {
    return {
      success: false,
      reference: `MOCK-FAIL-${orderRef}`,
      message: 'Simulated telecom API failure — retry available',
    };
  }

  return {
    success: true,
    reference: `MOCK-${networkSlug.toUpperCase()}-${Date.now()}`,
    message: `Data bundle ${apiCode} delivered to ${phone}`,
    deliveredAt: new Date().toISOString(),
  };
}

export async function purchaseBundle({ phone, apiCode, networkSlug, orderRef }) {
  const mode = process.env.TELECOM_MODE || 'mock';
  const client = getTelecomClient();

  if (mode === 'mock' || !client) {
    return mockPurchaseBundle({ phone, apiCode, networkSlug, orderRef });
  }

  try {
    const { data } = await client.post('/bundles/purchase', {
      phone: normalizePhone(phone),
      bundle_code: apiCode,
      network: networkSlug,
      reference: orderRef,
    });

    return {
      success: data.status === 'success' || data.success === true,
      reference: data.reference || data.transaction_id,
      message: data.message || 'Bundle purchase submitted',
      deliveredAt: data.delivered_at,
    };
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    return { success: false, reference: null, message };
  }
}

export async function checkBundleStatus(telecomRef) {
  const client = getTelecomClient();
  const mode = process.env.TELECOM_MODE || 'mock';

  if (mode === 'mock' || !client) {
    return { status: 'delivered', reference: telecomRef };
  }

  try {
    const { data } = await client.get(`/bundles/status/${telecomRef}`);
    return { status: data.status, reference: telecomRef, message: data.message };
  } catch {
    return { status: 'unknown', reference: telecomRef };
  }
}

export { NETWORK_PREFIXES };
