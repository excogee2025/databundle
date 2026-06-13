export const ROLES = {
  CUSTOMER: 'customer',
  BASIC_AGENT: 'basic_agent',
  SENIOR_AGENT: 'senior_agent',
  SUPER_AGENT: 'super_agent',
  ADMIN: 'admin',
};

export const ROLE_LABELS = {
  customer: 'Customer',
  basic_agent: 'Basic Agent',
  senior_agent: 'Senior Agent',
  super_agent: 'Super Agent',
  admin: 'Admin',
};

export const ROLE_COLORS = {
  customer: 'bg-slate-100 text-slate-700',
  basic_agent: 'bg-blue-100 text-blue-800',
  senior_agent: 'bg-purple-100 text-purple-800',
  super_agent: 'bg-amber-100 text-amber-800',
  admin: 'bg-red-100 text-red-800',
};

export const PERMISSIONS = {
  VIEW_BUNDLES: 'view_bundles',
  PURCHASE: 'purchase',
  WALLET: 'wallet',
  HISTORY: 'history',
  NOTIFICATIONS: 'notifications',
  SUPPORT: 'support',
  SELL_BUNDLES: 'sell_bundles',
  VIEW_PERSONAL_SALES: 'view_personal_sales',
  VIEW_COMMISSIONS: 'view_commissions',
  MANAGE_SUB_AGENTS: 'manage_sub_agents',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  LIMITED_PRICING: 'limited_pricing',
  PRIORITY_SUPPORT: 'priority_support',
  FULL_HIERARCHY: 'full_hierarchy',
  APPROVE_PROMOTIONS: 'approve_promotions',
  SYSTEM_ANALYTICS: 'system_analytics',
  MANAGE_USERS: 'manage_users',
  MANAGE_AGENTS: 'manage_agents',
  MANAGE_BUNDLES: 'manage_bundles',
  MANAGE_TRANSACTIONS: 'manage_transactions',
  MONITORING: 'monitoring',
  MANAGE_CONTENT: 'manage_content',
  MANAGE_SUPPORT: 'manage_support',
};

export function hasPermission(user, permission) {
  return user?.permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(user, ...permissions) {
  return permissions.some((p) => hasPermission(user, p));
}

export function isAgent(user) {
  return [ROLES.BASIC_AGENT, ROLES.SENIOR_AGENT, ROLES.SUPER_AGENT].includes(user?.role);
}

export function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

export function getDashboardPath(user) {
  if (isAdmin(user)) return '/admin';
  if (isAgent(user)) return '/agent';
  return '/dashboard';
}

export const ROLE_PERMISSIONS_MATRIX = {
  Customer: ['Register/login', 'View bundles', 'Purchase', 'Wallet', 'History', 'Notifications', 'Support'],
  'Basic Agent': ['Sell bundles', 'View personal sales', 'Commissions', 'Wallet', 'Notifications'],
  'Senior Agent': ['Manage sub-agents', 'Advanced analytics', 'Limited pricing', 'Priority support', '+ Basic Agent'],
  'Super Agent': ['Full hierarchy', 'Approve promotions', 'System analytics', 'Higher tiers', '+ Senior Agent'],
  Admin: ['Manage users/agents', 'Bundles', 'Transactions', 'Monitoring', 'Content', 'Support'],
};
