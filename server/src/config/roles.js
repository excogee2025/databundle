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

export const AGENT_ROLES = [
  ROLES.BASIC_AGENT,
  ROLES.SENIOR_AGENT,
  ROLES.SUPER_AGENT,
];

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

export const ROLE_PERMISSIONS = {
  [ROLES.CUSTOMER]: [
    PERMISSIONS.VIEW_BUNDLES,
    PERMISSIONS.PURCHASE,
    PERMISSIONS.WALLET,
    PERMISSIONS.HISTORY,
    PERMISSIONS.NOTIFICATIONS,
    PERMISSIONS.SUPPORT,
  ],
  [ROLES.BASIC_AGENT]: [
    PERMISSIONS.VIEW_BUNDLES,
    PERMISSIONS.SELL_BUNDLES,
    PERMISSIONS.VIEW_PERSONAL_SALES,
    PERMISSIONS.VIEW_COMMISSIONS,
    PERMISSIONS.WALLET,
    PERMISSIONS.NOTIFICATIONS,
    PERMISSIONS.SUPPORT,
  ],
  [ROLES.SENIOR_AGENT]: [
    PERMISSIONS.VIEW_BUNDLES,
    PERMISSIONS.SELL_BUNDLES,
    PERMISSIONS.VIEW_PERSONAL_SALES,
    PERMISSIONS.VIEW_COMMISSIONS,
    PERMISSIONS.MANAGE_SUB_AGENTS,
    PERMISSIONS.ADVANCED_ANALYTICS,
    PERMISSIONS.LIMITED_PRICING,
    PERMISSIONS.PRIORITY_SUPPORT,
    PERMISSIONS.WALLET,
    PERMISSIONS.NOTIFICATIONS,
    PERMISSIONS.SUPPORT,
  ],
  [ROLES.SUPER_AGENT]: [
    PERMISSIONS.VIEW_BUNDLES,
    PERMISSIONS.SELL_BUNDLES,
    PERMISSIONS.VIEW_PERSONAL_SALES,
    PERMISSIONS.VIEW_COMMISSIONS,
    PERMISSIONS.MANAGE_SUB_AGENTS,
    PERMISSIONS.FULL_HIERARCHY,
    PERMISSIONS.APPROVE_PROMOTIONS,
    PERMISSIONS.SYSTEM_ANALYTICS,
    PERMISSIONS.ADVANCED_ANALYTICS,
    PERMISSIONS.LIMITED_PRICING,
    PERMISSIONS.PRIORITY_SUPPORT,
    PERMISSIONS.WALLET,
    PERMISSIONS.NOTIFICATIONS,
    PERMISSIONS.SUPPORT,
  ],
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
};

export const COMMISSION_RATES = {
  [ROLES.BASIC_AGENT]: 0.03,
  [ROLES.SENIOR_AGENT]: 0.05,
  [ROLES.SUPER_AGENT]: 0.08,
};

export const AGENT_CREATE_PERMISSIONS = {
  [ROLES.SENIOR_AGENT]: [ROLES.BASIC_AGENT],
  [ROLES.SUPER_AGENT]: [ROLES.BASIC_AGENT, ROLES.SENIOR_AGENT],
  [ROLES.ADMIN]: [ROLES.BASIC_AGENT, ROLES.SENIOR_AGENT, ROLES.SUPER_AGENT],
};

export function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isAgent(role) {
  return AGENT_ROLES.includes(role);
}

export function isAdmin(role) {
  return role === ROLES.ADMIN;
}

export function canCreateAgentRole(managerRole, targetRole) {
  return AGENT_CREATE_PERMISSIONS[managerRole]?.includes(targetRole) ?? false;
}

export function getCommissionRate(role) {
  return COMMISSION_RATES[role] ?? 0;
}
