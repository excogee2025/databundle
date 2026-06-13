import prisma from '../lib/prisma.js';

export async function createNotification(userId, { title, message, type = 'info', link = null }) {
  return prisma.notification.create({
    data: { userId, title, message, type, link, status: 'sent' },
  });
}

export async function notifyOrderUpdate(userId, order) {
  const statusMessages = {
    completed: 'Your data bundle has been delivered successfully!',
    failed: 'Your order delivery failed. Contact support or retry.',
    processing: 'Your order is being processed.',
    paid: 'Payment received. Delivering your data bundle...',
  };

  return createNotification(userId, {
    title: `Order ${order.orderNumber}`,
    message: statusMessages[order.status] || `Order status: ${order.status}`,
    type: order.status === 'completed' ? 'success' : order.status === 'failed' ? 'warning' : 'order',
    link: `/track?order=${order.orderNumber}`,
  });
}

export async function getUserNotifications(userId, { unreadOnly = false } = {}) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function markNotificationRead(userId, notificationId) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function getUnreadCount(userId) {
  return prisma.notification.count({ where: { userId, read: false } });
}
