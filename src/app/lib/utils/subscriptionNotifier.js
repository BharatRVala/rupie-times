// src/app/lib/utils/subscriptionNotifier.js
import mongoose from 'mongoose';
import Notification from '@/app/lib/models/Notification';
import Subscription from '@/app/lib/models/Subscription';
import Product from '@/app/lib/models/product';
import User from '@/app/lib/models/User';

class SubscriptionNotifier {
  /**
   * ✅ Check and set initial subscription status based on time remaining
   * This is called when a subscription is first created
   * Returns: { status: 'active' | 'expiresoon', shouldNotify: boolean }
   */
  static checkInitialSubscriptionStatus(subscription) {
    try {
      const now = new Date();
      const endDate = new Date(subscription.endDate);

      if (endDate < now) {
        // Already expired (shouldn't happen but handle it)
        return { status: 'expired', shouldNotify: false };
      }

      const timeDiff = endDate - now;
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      const hoursRemaining = Math.ceil(timeDiff / (1000 * 60 * 60));
      const minutesRemaining = Math.ceil(timeDiff / (1000 * 60));

      const durationUnit = subscription.variant?.durationUnit;

      // Check if expiring soon based on duration unit
      if (durationUnit === 'minutes' && minutesRemaining <= 5 && minutesRemaining > 0) {
        return { status: 'expiresoon', shouldNotify: true };
      } else if (durationUnit === 'hours' && hoursRemaining <= 2 && hoursRemaining > 0) {
        return { status: 'expiresoon', shouldNotify: true };
      } else if (daysRemaining <= 10 && daysRemaining > 0) {
        // 10 days or less - set to expiresoon
        return { status: 'expiresoon', shouldNotify: true };
      }

      // Default to active
      return { status: 'active', shouldNotify: false };
    } catch (error) {
      console.error('Error checking initial subscription status:', error);
      return { status: 'active', shouldNotify: false };
    }
  }

  /**
   * ✅ Check renewal eligibility
   * Used for determining if "Renew" button should be shown and what type of renewal it is
   */
  static async checkRenewalEligibility(subscription) {
    try {
      const now = new Date();
      const endDate = new Date(subscription.endDate);

      // Check if subscription can be renewed
      if (subscription.status === 'expiresoon' && endDate > now) {
        return {
          canRenew: true,
          renewalType: 'before_expiry',
          message: 'Renew now to maintain continuous access',
          gracePeriodDays: Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
        };
      }

      if (subscription.status === 'expired') {
        const daysSinceExpiry = Math.ceil((now - endDate) / (1000 * 60 * 60 * 24));

        // Strict grace period (e.g. 1 day or 0 to match our strict logic)
        // Matching strict logic: > 0 means chain broken. 
        // But for UI "Renew" capability, we might allow it but warn about reset.

        if (daysSinceExpiry <= 7) {
          return {
            canRenew: true,
            renewalType: 'grace_period',
            message: 'Renew within grace period to maintain historical access',
            gracePeriodDays: 7 - daysSinceExpiry
          };
        } else {
          return {
            canRenew: true,
            renewalType: 'fresh_purchase',
            message: 'Renew to regain access (historical articles will be reset)',
            note: 'Gap too large for contiguous renewal'
          };
        }
      }

      return {
        canRenew: false,
        renewalType: 'not_eligible',
        message: 'Subscription is still active'
      };

    } catch (error) {
      console.error('Error checking renewal eligibility:', error);
      return {
        canRenew: false,
        renewalType: 'error',
        message: 'Unable to check renewal status'
      };
    }
  }

  /**
   * ✅ Check and update ALL subscription statuses automatically
   * This is called by cron job
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

      // Get ALL active subscriptions that need checking
      const subscriptions = await Subscription.find({
        paymentStatus: 'completed',
        endDate: { $exists: true, $ne: null }
      })
        .populate('user', 'name email')
        .populate('product', 'heading shortDescription');

      // console.log(`📊 Total subscriptions to check: ${subscriptions.length}`);

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
          if (endDate < now && oldStatus !== 'expired') {
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
            console.log(`   ❌ Marking as EXPIRED`);
          }
          // Check if expiring soon (2 days or less for regular, specific time for minutes/hours)
          // Also check if already expiresoon but should still be expiresoon (to update notifications if needed)
          else if ((oldStatus === 'active' || oldStatus === 'expiresoon') && endDate > now) {
            const durationUnit = subscription.variant?.durationUnit;
            let shouldBeExpiresoon = false;

            if (durationUnit === 'minutes' && minutesRemaining <= 5 && minutesRemaining > 0) {
              shouldBeExpiresoon = true;
              if (oldStatus !== 'expiresoon') {
                newStatus = 'expiresoon';
                shouldNotify = true;
                result.expiresoon.count++;
                result.expiresoon.details.push({
                  subscriptionId: subscription._id,
                  userId: subscription.user?._id || subscription.user,
                  product: subscription.product?.heading || 'Unknown',
                  oldStatus,
                  newStatus,
                  duration: subscription.variant?.duration,
                  durationUnit,
                  timeRemaining: `${minutesRemaining} minutes`,
                  note: '5-minute warning for minute-based subscription'
                });
                console.log(`   ⏰ Marking as EXPIRESOON (${minutesRemaining} minutes left)`);
              }
            }
            else if (durationUnit === 'hours' && hoursRemaining <= 2 && hoursRemaining > 0) {
              shouldBeExpiresoon = true;
              if (oldStatus !== 'expiresoon') {
                newStatus = 'expiresoon';
                shouldNotify = true;
                result.expiresoon.count++;
                result.expiresoon.details.push({
                  subscriptionId: subscription._id,
                  userId: subscription.user?._id || subscription.user,
                  product: subscription.product?.heading || 'Unknown',
                  oldStatus,
                  newStatus,
                  duration: subscription.variant?.duration,
                  durationUnit,
                  timeRemaining: `${hoursRemaining} hours`,
                  note: '2-hour warning for hour-based subscription'
                });
                console.log(`   ⏰ Marking as EXPIRESOON (${hoursRemaining} hours left)`);
              }
            }
            else if (daysRemaining <= 10 && daysRemaining > 0) {
              shouldBeExpiresoon = true;
              if (oldStatus !== 'expiresoon') {
                newStatus = 'expiresoon';
                shouldNotify = true;
                result.expiresoon.count++;
                result.expiresoon.details.push({
                  subscriptionId: subscription._id,
                  userId: subscription.user?._id || subscription.user,
                  product: subscription.product?.heading || 'Unknown',
                  oldStatus,
                  newStatus,
                  duration: subscription.variant?.duration,
                  endDate: subscription.endDate
                });
                console.log(`   ⏰ Marking as EXPIRESOON (${daysRemaining} days left)`);
              }
            }

            // If it was expiresoon but now has more than 10 days, revert to active (shouldn't happen but handle it)
            if (oldStatus === 'expiresoon' && !shouldBeExpiresoon && daysRemaining > 10) {
              newStatus = 'active';
              console.log(`   ✅ Reverting from EXPIRESOON to ACTIVE (${daysRemaining} days remaining)`);
            }
          }

          // Update status if changed
          if (newStatus !== oldStatus) {
            subscription.status = newStatus;
            subscription.lastStatusCheck = now;
            await subscription.save();

            // console.log(`   ✅ Status updated: ${oldStatus} → ${newStatus}`);

            // Create notification if status changed
            if (shouldNotify) {
              const notification = await this.createStatusChangeNotification(
                subscription,
                oldStatus,
                newStatus,
                triggeredBy
              );

              if (notification) {
                result.notifications.push(notification._id);
                // console.log(`   📨 Notification created: ${notification._id}`);

                // Emit real-time notification via Socket.io if available
                this.emitRealTimeNotification(subscription.user?._id || subscription.user, notification);
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
      // console.log(`   Errors: ${result.errors.length}`);

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
  static async createStatusChangeNotification(subscription, oldStatus, newStatus, triggeredBy = 'system') {
    try {
      // console.log('📝 [SubscriptionNotifier.createStatusChangeNotification] START');
      // console.log(`   Subscription ID: ${subscription._id}`);
      // console.log(`   Old Status: ${oldStatus}`);
      // console.log(`   New Status: ${newStatus}`);
      // console.log(`   Triggered By: ${triggeredBy}`);

      // Ensure we have populated data
      let userId = subscription.user?._id || subscription.user;
      let productName = subscription.product?.heading || 'Product';

      // console.log(`   User ID: ${userId}`);
      // console.log(`   Product Name: ${productName}`);

      // Determine notification type and content
      let notificationType;
      let title;
      let message;

      if (newStatus === 'active') {
        notificationType = 'subscription_active';
        title = 'Subscription Active';

        message = `Your product "${productName}" has active now. you can start reading your articles.`;
      }
      else if (newStatus === 'expiresoon') {
        notificationType = 'subscription_expiring_soon';
        title = 'Subscription Expiring Soon';

        // Calculate time remaining
        const endDate = new Date(subscription.endDate);
        const endDateStr = endDate.toLocaleDateString();
        const now = new Date();
        const timeDiff = endDate - now;
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        const hoursRemaining = Math.ceil(timeDiff / (1000 * 60 * 60));
        const minutesRemaining = Math.ceil(timeDiff / (1000 * 60));

        if (subscription.variant?.durationUnit === 'days' || subscription.variant?.durationUnit === 'months' || subscription.variant?.durationUnit === 'years') {
          // STRICT NOTIFICATION RULES: Only notify at 10 days or 3 days
          if (daysRemaining !== 10 && daysRemaining !== 3) {
            console.log(`   ℹ️ Suppressing client notification (Day ${daysRemaining} is not 10 or 3)`);
            return null;
          }
        }

        let timeText = '';
        if (subscription.variant?.durationUnit === 'minutes' && minutesRemaining <= 5) {
          timeText = `${minutesRemaining} minute(s)`;
        } else if (subscription.variant?.durationUnit === 'hours' && hoursRemaining <= 2) {
          timeText = `${hoursRemaining} hour(s)`;
        } else {
          timeText = `${daysRemaining} day(s)`;
        }

        let timeLeftString = daysRemaining > 0 ? `${daysRemaining} days` : timeText;

        message = `Your "${productName}" subscription is expiring in ${timeLeftString}. Renew now to continue access.`;
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
      // This prevents race conditions between Server Cron and Client Real-time Check
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

      // Create the notification using the Notification model
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
          triggeredBy,
          subscriptionDetails: {
            productName,
            startDate: subscription.startDate,
            endDate: subscription.endDate
          }
        }
      });

      // console.log(`✅ [SubscriptionNotifier] Notification created successfully: ${notification._id}`);
      return notification;
    } catch (error) {
      console.error('❌ [SubscriptionNotifier.createStatusChangeNotification] ERROR:', error);
      console.error('❌ Error details:', {
        subscriptionId: subscription?._id,
        oldStatus,
        newStatus,
        triggeredBy,
        errorMessage: error.message
      });
      return null;
    }
  }

  /**
   * ✅ Create notification for NEW subscription (when user buys)
   */
  static async createNewSubscriptionNotification(subscription) {
    try {
      console.log('🎉 [SubscriptionNotifier] Creating new subscription notification');
      return await this.createStatusChangeNotification(
        subscription,
        null,
        'active',
        'payment'
      );
    } catch (error) {
      console.error('❌ Error creating new subscription notification:', error);
      return null;
    }
  }

  /**
   * ✅ Emit real-time notification via Socket.io
   */
  static emitRealTimeNotification(userId, notification) {
    try {
      if (global.io) {
        global.io.to(userId.toString()).emit('new_notification', {
          notificationId: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.notificationType,
          timestamp: new Date()
        });
        console.log(`📡 Real-time notification emitted to user ${userId}`);
      }
    } catch (error) {
      console.error('Error emitting real-time notification:', error);
    }
  }

  /**
   * ✅ Check specific user's subscriptions
   */
  static async checkUserSubscriptions(userId) {
    try {
      const subscriptions = await Subscription.find({
        user: userId,
        paymentStatus: 'completed',
        status: { $in: ['active', 'expiresoon'] }
      });

      const updates = [];

      for (const subscription of subscriptions) {
        const oldStatus = subscription.status;
        const now = new Date();
        const endDate = new Date(subscription.endDate);

        let newStatus = oldStatus;
        let shouldNotify = false;

        // Check EXPIRED
        if (endDate < now && oldStatus !== 'expired') {
          newStatus = 'expired';
          shouldNotify = true;
        }
        // Check EXPIRESOON (logic copied from checkAndUpdateAllSubscriptions)
        else if ((oldStatus === 'active' || oldStatus === 'expiresoon') && endDate > now) {
          const timeDiff = endDate - now;
          const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
          const hoursRemaining = Math.ceil(timeDiff / (1000 * 60 * 60));
          const minutesRemaining = Math.ceil(timeDiff / (1000 * 60));
          const durationUnit = subscription.variant?.durationUnit;

          let shouldBeExpiresoon = false;

          if (durationUnit === 'minutes' && minutesRemaining <= 5 && minutesRemaining > 0) {
            shouldBeExpiresoon = true;
          } else if (durationUnit === 'hours' && hoursRemaining <= 2 && hoursRemaining > 0) {
            shouldBeExpiresoon = true;
          } else if (daysRemaining <= 10 && daysRemaining > 0) {
            shouldBeExpiresoon = true;
          }

          if (shouldBeExpiresoon && oldStatus !== 'expiresoon') {
            newStatus = 'expiresoon';
            shouldNotify = true;
          }
        }

        if (newStatus !== oldStatus) {
          subscription.status = newStatus;
          subscription.lastStatusCheck = now;
          await subscription.save();

          // Create notification
          const notification = await this.createStatusChangeNotification(
            subscription,
            oldStatus,
            newStatus,
            'manual_check' // Triggered by user visit
          );

          updates.push({
            subscriptionId: subscription._id,
            oldStatus,
            newStatus,
            notificationId: notification?._id
          });
        }
      }

      return { success: true, updates };
    } catch (error) {
      console.error('Error checking user subscriptions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ Get subscription status summary
   */
  static async getStatusSummary() {
    try {
      const stats = await Subscription.aggregate([
        {
          $match: { paymentStatus: 'completed' }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$variant.price' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      const totalSubscriptions = stats.reduce((sum, stat) => sum + stat.count, 0);
      const totalValue = stats.reduce((sum, stat) => sum + (stat.totalValue || 0), 0);

      return {
        success: true,
        stats: {
          totalSubscriptions,
          totalValue,
          byStatus: stats
        }
      };
    } catch (error) {
      console.error('Error getting subscription summary:', error);
      return { success: false, error: error.message };
    }
  }
}

export { SubscriptionNotifier };