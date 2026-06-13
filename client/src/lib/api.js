import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

// ─── Auth (Spec) ──────────────────────────────────────────────────
export const auth = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  consent: () => api.post('/auth/consent'),
  exportData: () => api.get('/auth/me/export'),
  deleteAccount: () => api.delete('/auth/me'),
};

// ─── Bundles (Spec: /api/bundles, /api/bundles/:id) ───────────────
export const bundles = {
  getNetworks: () => api.get('/bundles/networks'),
  getAll: (params) => api.get('/bundles', { params }),
  getById: (id) => api.get(`/bundles/${id}`),
};

// ─── Purchases (Spec: /api/purchase) ─────────────────────────────
export const purchase = {
  create: (data) => api.post('/purchase', data),
  history: (userId) => api.get(`/purchase/history/${userId}`),
  verifyPayment: (reference) => api.post('/purchase/verify-payment', { reference }),
  detectNetwork: (phone) => api.post('/purchase/detect-network', { phone }),
};

// Legacy alias
export const orders = {
  create: (data) => purchase.create(data),
  track: (orderNumber) => api.get(`/orders/track/${orderNumber}`),
  myOrders: () => api.get('/orders/my'),
  verifyPayment: purchase.verifyPayment,
  detectNetwork: purchase.detectNetwork,
  adminAll: () => api.get('/orders/admin/all'),
  adminStats: () => api.get('/orders/admin/stats'),
  adminRetry: (id) => api.post(`/orders/admin/${id}/retry`),
};

// ─── Dashboards (Spec) ───────────────────────────────────────────
export const dashboard = {
  customer: (id) => api.get(`/dashboard/customer/${id}`),
  agent: (id) => api.get(`/dashboard/agent/${id}`),
  admin: () => api.get('/dashboard/admin'),
};

// ─── Agents (Spec) ───────────────────────────────────────────────
export const agents = {
  list: () => api.get('/agents'),
  sales: (id) => api.get(`/agents/${id}/sales`),
  dashboard: () => api.get('/agents/dashboard'),
  commissions: () => api.get('/agents/commissions'),
  sell: (data) => api.post('/agents/sell', data),
  subAgents: () => api.get('/agents/sub-agents'),
  createSubAgent: (data) => api.post('/agents/sub-agents', data),
  analytics: () => api.get('/agents/analytics'),
  pricing: () => api.get('/agents/pricing'),
  setPricing: (bundleId, customPrice) => api.put(`/agents/pricing/${bundleId}`, { customPrice }),
  promotions: () => api.get('/agents/promotions'),
  createPromotion: (data) => api.post('/agents/promotions', data),
  approvePromotion: (id, action) => api.post(`/agents/promotions/${id}/approve`, { action }),
  bundlePrice: (bundleId) => api.get(`/agents/bundle-price/${bundleId}`),
};

export const wallet = {
  balance: () => api.get('/wallet/balance'),
  history: () => api.get('/wallet/history'),
  topup: (data) => api.post('/wallet/topup', data),
  verifyTopup: (reference) => api.post('/wallet/topup/verify', { reference }),
};

// ─── Notifications (Spec) ──────────────────────────────────────────
export const notifications = {
  list: () => api.get('/notifications'),
  forUser: (userId) => api.get(`/notifications/user/${userId}`),
  send: (data) => api.post('/notifications/send', data),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

// ─── Telecom (Spec) ──────────────────────────────────────────────
export const telecom = {
  activate: (data) => api.post('/telecom/activate', data),
  status: (transactionId) => api.get(`/telecom/status/${transactionId}`),
  detectNetwork: (phone) => api.post('/telecom/detect-network', { phone }),
};

// ─── Security (Spec) ─────────────────────────────────────────────
export const security = {
  auditLogs: (params) => api.get('/logs', { params }),
  scan: () => api.post('/security/scan'),
  fraudAlerts: (params) => api.get('/security/fraud-alerts', { params }),
  resolveAlert: (id) => api.patch(`/security/fraud-alerts/${id}/resolve`),
};

export const support = {
  create: (data) => api.post('/support', data),
  myTickets: () => api.get('/support/my'),
  adminAll: () => api.get('/support/admin/all'),
  adminUpdate: (id, data) => api.patch(`/support/admin/${id}`, data),
};

export const admin = {
  stats: () => api.get('/admin/stats'),
  users: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  transactions: () => api.get('/admin/transactions'),
  bundles: () => api.get('/admin/bundles'),
  updateBundle: (id, data) => api.patch(`/admin/bundles/${id}`, data),
  roles: () => api.get('/admin/roles'),
};

// ─── Analytics & Reports ───────────────────────────────────────────
export const analytics = {
  customerTrends: (params) => api.get('/analytics/customer-trends', { params }),
  agentPerformance: (params) => api.get('/analytics/agent-performance', { params }),
  revenueForecast: (params) => api.get('/analytics/revenue-forecast', { params }),
  full: (params) => api.get('/analytics/full', { params }),
  downloadExport: async (type, format, params = {}) => {
    const response = await api.get(`/analytics/export/${type}/${format}`, {
      params,
      responseType: 'blob',
    });
    const ext = format === 'pdf' ? 'pdf' : 'csv';
    const mime = format === 'pdf' ? 'application/pdf' : 'text/csv';
    const blob = new Blob([response.data], { type: mime });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `databundle-${type}-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

