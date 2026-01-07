// src/app/lib/utils/initCron.js
import { startSubscriptionExpiryCron } from '@/app/lib/cron/subscriptionExpiry';

export function initializeCronJobs() {
  if (process.env.NODE_ENV === 'production') {
    startSubscriptionExpiryCron();
  } else {
    // In development, you might want to run it less frequently or manually
    console.log('🛠️ Cron jobs disabled in development');
  }
}