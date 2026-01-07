// src/app/lib/utils/subscriptionNotifierServer.js
// Server-side version using CommonJS to ensure compatibility with node server.js

const mongoose = require('mongoose');

class SubscriptionNotifier {
  /**
   * ✅ Check and set initial subscription status based on time remaining
   */
  static checkInitialSubscriptionStatus(subscription) {
    try {
      const now = new Date();
      const endDate = new Date(subscription.endDate);

      if (endDate < now) {
        return { status: 'expired', shouldNotify: false };
      }

      const timeDiff = endDate - now;
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      const hoursRemaining = Math.ceil(timeDiff / (1000 * 60 * 60));
      const minutesRemaining = Math.ceil(timeDiff / (1000 * 60));

      const durationUnit = subscription.variant?.durationUnit;

      if (durationUnit === 'minutes' && minutesRemaining <= 5 && minutesRemaining > 0) {
        return { status: 'expiresoon', shouldNotify: true };
      } else if (durationUnit === 'hours' && hoursRemaining <= 2 && hoursRemaining > 0) {
        return { status: 'expiresoon', shouldNotify: true };
      } else if (daysRemaining <= 10 && daysRemaining > 0) {
        return { status: 'expiresoon', shouldNotify: true };
      }

      return { status: 'active', shouldNotify: false };
    } catch (error) {
      console.error('Error checking initial subscription status:', error);
      return { status: 'active', shouldNotify: false };
    }
  }

  /**
   * ✅ Check and update ALL subscription statuses automatically
   */
  static async checkAndUpdateAllSubscriptions(triggeredBy = 'cron') {
    const result = {
      success: false,
      processed: 0,
      timestamp: new Date(),
      triggeredBy,
      expired: { count: 0, details: [] },
      expiresoon: { count: 0, details: [] },
      notifications: [],
      errors: []
    };

    try {
      // console.log(`🔔 [SubscriptionNotifier] Starting subscription check...`);
      // console.log(`   Triggered by: ${triggeredBy}`);
      // console.log(`   Time: ${result.timestamp.toISOString()}`);

      // Get models from mongoose (already loaded in server.js)
      const Subscription = mongoose.models.Subscription;
      const Notification = mongoose.models.Notification;

      if (!Subscription || !Notification) {
        console.error('❌ [SubscriptionNotifier] Models not found. Subscription:', !!Subscription, 'Notification:', !!Notification);
        result.error = 'Models not loaded';
        return result;
      }

      // Get ALL subscriptions that need checking (active, expiresoon, AND expired for missing notification check)
      // Use efficient query
      const subscriptions = await Subscription.find({
        paymentStatus: 'completed',
        endDate: { $exists: true, $ne: null }
      })
        .populate('user', 'name email')
        .populate('product', 'heading shortDescription');

      // console.log(`📊 Total subscriptions to check: ${subscriptions.length}`);

      // ✅ ADDITIONAL: Check for expired subscriptions that don't have expired notifications
      // Only run this check every 5 minutes to avoid performance issues
      const now = new Date();
      // Changed to every minute for debugging/immediate fix, or keep 5. User wants "auto gen fix", so being aggressive is safe.
      // const shouldCheckMissingNotifications = now.getMinutes() % 5 === 0; 
      const shouldCheckMissingNotifications = true; // FORCE check every time for now

      if (shouldCheckMissingNotifications) {
        const expiredSubscriptions = await Subscription.find({
          paymentStatus: 'completed',
          status: 'expired',
          endDate: { $lt: now }
        })
          .populate('user', 'name email')
          .populate('product', 'heading shortDescription')
          .limit(100);

        // console.log(`📊 Found ${expiredSubscriptions.length} expired subscriptions to verify notifications for`);

        for (const expiredSub of expiredSubscriptions) {
          try {
            const userId = expiredSub.user?._id || expiredSub.user;

            // Check if expired notification already exists
            const existingNotification = await Notification.findOne({
              userId: userId,
              subscriptionId: expiredSub._id,
              notificationType: 'subscription_expired'
            });

            if (!existingNotification) {
              // console.log(`   ⚠️ Expired subscription ${expiredSub._id} missing notification, creating...`);

              // Create expired notification - treat as if it changed from active/expiresoon to expired
              const notification = await this.createStatusChangeNotification(
                expiredSub,
                'expiresoon', // Treat as if it was expiresoon before expiring
                'expired',
                'cron',
                Notification
              );

              if (notification) {
                result.notifications.push(notification._id);
                result.expired.count++;

                // Emit real-time notification
                if (global.io && userId) {
                  global.io.to(userId.toString()).emit('new_notification', {
                    notificationId: notification._id,
                    title: notification.title,
                    message: notification.message,
                    type: notification.notificationType,
                    timestamp: new Date()
                  });
                }
              }
            }
          } catch (error) {
            console.error(`❌ Error checking expired subscription ${expiredSub._id}:`, error);
          }
        }
      }

      for (const subscription of subscriptions) {
        try {
          const oldStatus = subscription.status;
          const now = new Date();
          const endDate = new Date(subscription.endDate);
          const timeDiff = endDate - now;
          const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
          const hoursRemaining = Math.ceil(timeDiff / (1000 * 60 * 60));
          const minutesRemaining = Math.ceil(timeDiff / (1000 * 60));

          let newStatus = oldStatus;
          let shouldNotify = false;

          // Check if expired
          if (endDate < now) {
            if (oldStatus !== 'expired') {
              // Status changed to expired - need notification
              newStatus = 'expired';
              shouldNotify = true;
              result.expired.count++;
              result.expired.details.push({
                subscriptionId: subscription._id,
                userId: subscription.user?._id || subscription.user,
                product: subscription.product?.heading || 'Unknown',
                oldStatus,
                newStatus,
                endDate: subscription.endDate
              });
              // console.log(`   ❌ Marking as EXPIRED (was ${oldStatus})`);
            }
          }
          // Check if expiring soon
          else if ((oldStatus === 'active' || oldStatus === 'expiresoon') && endDate > now) {
            const durationUnit = subscription.variant?.durationUnit;
            let shouldBeExpiresoon = false;

            if (durationUnit === 'minutes' && minutesRemaining <= 5 && minutesRemaining > 0) {
              shouldBeExpiresoon = true;
              if (oldStatus !== 'expiresoon') {
                newStatus = 'expiresoon';
                shouldNotify = true;
                result.expiresoon.count++;
                // console.log(`   ⏰ Marking as EXPIRESOON (${minutesRemaining} minutes left)`);
              }
            }
            else if (durationUnit === 'hours' && hoursRemaining <= 2 && hoursRemaining > 0) {
              shouldBeExpiresoon = true;
              if (oldStatus !== 'expiresoon') {
                newStatus = 'expiresoon';
                shouldNotify = true;
                result.expiresoon.count++;
                // console.log(`   ⏰ Marking as EXPIRESOON (${hoursRemaining} hours left)`);
              }
            }
            else if (daysRemaining <= 10 && daysRemaining > 0) {
              shouldBeExpiresoon = true;

              const isNotificationDay = (daysRemaining === 10 || daysRemaining === 3);

              if (oldStatus !== 'expiresoon') {
                newStatus = 'expiresoon';
                result.expiresoon.count++;

                if (isNotificationDay) {
                  shouldNotify = true;
                }
              }
              else if (isNotificationDay) {
                shouldNotify = true;
              }

              if (shouldNotify) {
                try {
                  const startOfToday = new Date();
                  startOfToday.setHours(0, 0, 0, 0);
                  const endOfToday = new Date();
                  endOfToday.setHours(23, 59, 59, 999);

                  const alreadySentToday = await Notification.findOne({
                    subscriptionId: subscription._id,
                    notificationType: 'subscription_expiring_soon',
                    createdAt: { $gte: startOfToday, $lte: endOfToday }
                  });

                  if (alreadySentToday) {
                    shouldNotify = false;
                  }
                } catch (err) {
                  console.error('Error checking for duplicate notification:', err);
                }
              }
            }
          }

          // Update status if changed
          if (newStatus !== oldStatus) {
            subscription.status = newStatus;
            subscription.lastStatusCheck = now;
            await subscription.save();

            // console.log(`   ✅ Status updated: ${oldStatus} → ${newStatus}`);
          }

          // Create notification if status changed OR if already expired but missing notification
          if (shouldNotify) {
            const notification = await this.createStatusChangeNotification(
              subscription,
              oldStatus,
              newStatus,
              triggeredBy,
              Notification
            );

            if (notification) {
              result.notifications.push(notification._id);

              // Emit real-time notification via Socket.io if available
              if (global.io) {
                const userId = subscription.user?._id || subscription.user;
                if (userId) {
                  global.io.to(userId.toString()).emit('new_notification', {
                    notificationId: notification._id,
                    title: notification.title,
                    message: notification.message,
                    type: notification.notificationType,
                    timestamp: new Date()
                  });
                }
              }
            }
          }

          result.processed++;
        } catch (subscriptionError) {
          console.error(`❌ Error processing subscription ${subscription._id}:`, subscriptionError);
          result.errors.push({
            subscriptionId: subscription._id,
            type: 'subscription_processing',
            error: subscriptionError.message
          });
        }
      }

      result.success = true;
      // console.log(`✅ [SubscriptionNotifier] Check completed:`);
      // console.log(`   Processed: ${result.processed} subscriptions`);
      // console.log(`   Expired: ${result.expired.count}`);
      // console.log(`   Expiring soon: ${result.expiresoon.count}`);
      // console.log(`   Notifications: ${result.notifications.length}`);

      return result;
    } catch (error) {
      console.error('❌ [SubscriptionNotifier] Fatal error:', error);
      result.error = error.message;
      return result;
    }
  }

  /**
   * ✅ Create notification for subscription status change
   */
  static async createStatusChangeNotification(subscription, oldStatus, newStatus, triggeredBy = 'system', NotificationModel) {
    try {
      const Notification = NotificationModel || mongoose.models.Notification;
      if (!Notification) {
        console.error('❌ Notification model not available');
        return null;
      }

      let userId = subscription.user?._id || subscription.user;
      let productName = subscription.product?.heading || 'Product';

      // Determine notification type and content
      let notificationType;
      let title;
      let message;

      if (newStatus === 'active') {
        notificationType = 'subscription_active';
        title = 'Subscription Activated';
        message = `Your subscription for "${productName}" has been activated!`;
      }
      else if (newStatus === 'expiresoon') {
        notificationType = 'subscription_expiring_soon';
        title = 'Subscription Expiring Soon';

        const endDate = new Date(subscription.endDate);
        const now = new Date();
        const timeDiff = endDate - now;
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        const hoursRemaining = Math.ceil(timeDiff / (1000 * 60 * 60));
        const minutesRemaining = Math.ceil(timeDiff / (1000 * 60));

        if (subscription.variant?.durationUnit === 'minutes' && minutesRemaining <= 5) {
          message = `Your "${productName}" subscription is expiring in ${minutesRemaining} minute(s). Renew now to continue access.`;
        } else if (subscription.variant?.durationUnit === 'hours' && hoursRemaining <= 2) {
          message = `Your "${productName}" subscription is expiring in ${hoursRemaining} hour(s). Renew now to continue access.`;
        } else if (daysRemaining <= 10) {
          message = `Your "${productName}" subscription is expiring in ${daysRemaining} day(s). Renew now to continue access.`;
        } else {
          message = `Your subscription for "${productName}" is expiring soon.`;
        }
      }
      else if (newStatus === 'expired') {
        notificationType = 'subscription_expired';
        title = 'Subscription Expired';

        message = `Your product "${productName}" has expired. Renew to regain the access.`;
      }
      else {
        notificationType = 'general';
        title = 'Subscription Update';
        message = `The status of your subscription for "${productName}" has been updated.`;
      }

      console.log(`   Notification Type: ${notificationType}`);
      console.log(`   Title: ${title}`);
      console.log(`   Message: ${message}`);

      // ✅ DUPLICATE CHECK (Debounce)
      // Check if we sent this exact type of notification for this subscription recently (e.g. 10 mins)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const existingNotification = await Notification.findOne({
        subscriptionId: subscription._id,
        notificationType: notificationType,
        createdAt: { $gte: tenMinutesAgo }
      });

      if (existingNotification) {
        console.log(`   ⚠️ Skipping duplicate notification (sent within 10 mins): ${existingNotification._id}`);
        return existingNotification;
      }

      const validTriggeredByValues = ['system', 'admin', 'payment', 'cron', 'auto_check', 'manual_check'];
      const safeTriggeredBy = validTriggeredByValues.includes(triggeredBy) ? triggeredBy : 'system';

      // Create the notification
      const notification = await Notification.create({
        title,
        message,
        userId: userId,
        subscriptionId: subscription._id,
        notificationType,
        isBroadcast: false,
        isRead: false,
        metadata: {
          oldStatus,
          newStatus,
          triggeredBy: safeTriggeredBy,
          subscriptionDetails: {
            productName,
            status: newStatus,
            endDate: subscription.endDate
          }
        }
      });

      // console.log(`✅ [SubscriptionNotifier] Notification created successfully: ${notification._id}`);

      return notification;
    } catch (error) {
      console.error('❌ [SubscriptionNotifier.createStatusChangeNotification] ERROR:', error);
      return null;
    }
  }
}

module.exports = { SubscriptionNotifier };
