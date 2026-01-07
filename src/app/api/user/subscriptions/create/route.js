// src/app/api/user/subscriptions/create/route.js - UPDATED
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Subscription from '@/app/lib/models/Subscription';
import Product from '@/app/lib/models/product';
import { SubscriptionNotifier } from '@/app/lib/utils/subscriptionNotifier';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function POST(request) {
  try {
    // ✅ Updated authentication - uses new middleware pattern
    const user = authenticateUser(request);

    await connectDB();

    const body = await request.json();
    const { productId, duration, paymentMethod = 'razorpay', paymentId, transactionId } = body;

    // Validate input
    if (!productId || !duration) {
      return NextResponse.json(
        { success: false, error: 'Product ID and duration are required' },
        { status: 400 }
      );
    }

    // Check if product exists and is active
    const product = await Product.findOne({
      _id: productId,
      isActive: true
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found or inactive' },
        { status: 404 }
      );
    }

    // Find the selected variant
    const variant = product.variants.find(v => v.duration === duration);
    if (!variant) {
      const availableDurations = product.variants.map(v => `"${v.duration}"`).join(', ');
      return NextResponse.json(
        {
          success: false,
          error: `Selected duration "${duration}" is not available. Available: ${availableDurations}`
        },
        { status: 400 }
      );
    }

    // ✅ Check for existing latest subscription
    const existingLatestSubscription = await Subscription.findOne({
      user: user.id,
      product: productId,
      isLatest: true
    });

    let startDate = new Date();
    let coverageStartDate = new Date(startDate);
    let endDate = new Date(startDate);

    if (existingLatestSubscription) {
      // Check if existing subscription is effectively active (active or expiresoon and not expired by date)
      const isExistingActive = (existingLatestSubscription.status === 'active' || existingLatestSubscription.status === 'expiresoon') && new Date(existingLatestSubscription.endDate) > new Date();

      if (isExistingActive) {
        coverageStartDate = existingLatestSubscription.endDate;
        startDate = existingLatestSubscription.endDate; // Set start date to future for proper 'upcoming' status
      }

      // Mark old subscription as not latest
      existingLatestSubscription.isLatest = false;
      await existingLatestSubscription.save();

      // console.log(`📝 Marked old subscription ${existingLatestSubscription._id} as not latest`);
    }

    // Calculate end date
    // console.log('🕒 Processing duration:', {
    //   duration: variant.duration,
    //   value: variant.durationValue,
    //   unit: variant.durationUnit,
    //   price: variant.price
    // });

    let calculatedEndDate = new Date(coverageStartDate);

    switch (variant.durationUnit) {
      case 'minutes':
        calculatedEndDate.setMinutes(calculatedEndDate.getMinutes() + variant.durationValue);
        // console.log(`⏰ Added ${variant.durationValue} minutes`);
        break;

      case 'hours':
        calculatedEndDate.setHours(calculatedEndDate.getHours() + variant.durationValue);
        // console.log(`⏰ Added ${variant.durationValue} hours`);
        break;

      case 'days':
        calculatedEndDate.setDate(calculatedEndDate.getDate() + variant.durationValue);
        // console.log(`⏰ Added ${variant.durationValue} days`);
        break;

      case 'weeks':
        calculatedEndDate.setDate(calculatedEndDate.getDate() + (variant.durationValue * 7));
        // console.log(`⏰ Added ${variant.durationValue} weeks`);
        break;

      case 'months':
        calculatedEndDate.setMonth(calculatedEndDate.getMonth() + variant.durationValue);
        // console.log(`⏰ Added ${variant.durationValue} months`);
        break;

      case 'years':
        calculatedEndDate.setFullYear(calculatedEndDate.getFullYear() + variant.durationValue);
        // console.log(`⏰ Added ${variant.durationValue} years`);
        break;

      default:
        calculatedEndDate.setMonth(calculatedEndDate.getMonth() + 1);
      // console.log('⏰ Used default 1 month');
    }

    // console.log('📅 Final dates:', {
    //   startDate: startDate.toISOString(),
    //   endDate: calculatedEndDate.toISOString(),
    //   durationInDays: Math.ceil((calculatedEndDate - startDate) / (1000 * 60 * 60 * 24))
    // });

    // Apply enhanced end date
    endDate = calculatedEndDate;

    // Create new subscription object (don't save yet)
    const subscriptionData = {
      user: user.id,
      product: productId,
      variant: {
        duration: variant.duration,
        durationValue: variant.durationValue,
        durationUnit: variant.durationUnit,
        price: variant.price
      },
      paymentStatus: 'completed',
      paymentId,
      transactionId,
      startDate,
      endDate,
      isLatest: true,
      replacedSubscription: existingLatestSubscription ? existingLatestSubscription._id : null,
      metadata: {
        paymentMethod,
        paymentVerifiedAt: new Date(),
        subscribedAt: new Date(),
        articleAccessStart: startDate,
        extendedFrom: existingLatestSubscription ? existingLatestSubscription._id : null,
        purchaseType: existingLatestSubscription ? 'renewal' : 'new'
      }
    };

    // ✅ CHECK: Determine initial status based on time remaining
    // If subscription has less than 2 days, set to "expiresoon" immediately
    const initialStatusCheck = SubscriptionNotifier.checkInitialSubscriptionStatus({
      endDate: subscriptionData.endDate,
      variant: subscriptionData.variant
    });

    subscriptionData.status = initialStatusCheck.status;


    // Create subscription with correct initial status
    const subscription = new Subscription(subscriptionData);
    await subscription.save();

    // console.log(`✅ Created new subscription for user ${user.id}, product ${productId}`);
    // console.log(`   Subscription ID: ${subscription._id}`);
    // console.log(`   Duration: ${variant.duration}`);
    // console.log(`   Price: ₹${variant.price}`);
    // console.log(`   Initial Status: ${subscription.status}`);

    if (existingLatestSubscription) {
      // console.log(`✅ Replaced old subscription ${existingLatestSubscription._id}`);
    }

    // ✅ IMPORTANT: Create notifications for new subscription
    // console.log('🔔 Creating notification for new subscription...');

    // First, create the standard "subscription activated" notification if status is active
    let notification = null;
    if (subscription.status === 'active') {
      notification = await SubscriptionNotifier.createNewSubscriptionNotification(subscription);
    }
    // If status is expiresoon, create the expiresoon notification instead
    else if (subscription.status === 'expiresoon') {
      // Populate product for notification
      await subscription.populate('product', 'heading shortDescription');
      notification = await SubscriptionNotifier.createStatusChangeNotification(
        subscription,
        'active', // Treat as if it was active first
        'expiresoon',
        'payment' // Triggered by payment/creation
      );
    }

    if (notification) {
      // console.log(`✅ Notification created: ${notification._id}`);
      // console.log(`   Title: ${notification.title}`);
      // console.log(`   User: ${user.id}`);
    } else {
      console.warn('⚠️ Failed to create notification for new subscription');
    }

    // Populate product details for response
    await subscription.populate('product', 'heading shortDescription filename category articles');

    // Accessible articles
    const accessibleArticles = subscription.product.getAccessibleArticles(startDate, 5);
    const accessibleArticlesCount = accessibleArticles.length;

    return NextResponse.json({
      success: true,
      message: existingLatestSubscription ? 'Subscription renewed successfully' : 'Subscription created successfully',
      subscription: {
        id: subscription._id,
        product: subscription.product ? {
          _id: subscription.product._id,
          heading: subscription.product.heading,
          shortDescription: subscription.product.shortDescription,
          filename: subscription.product.filename,
          category: subscription.product.category
        } : null,
        variant: subscription.variant,
        status: subscription.status,
        paymentStatus: subscription.paymentStatus,
        paymentId: subscription.paymentId,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        isActive: subscription.isActive,
        isExpiringSoon: subscription.isExpiringSoon,
        daysRemaining: subscription.daysRemaining,
        isLatest: subscription.isLatest,
        articleAccess: {
          accessibleArticlesCount,
          showingLatest: Math.min(5, accessibleArticlesCount),
          startDate: subscription.startDate
        },
        replacedOldSubscription: !!existingLatestSubscription
      },
      notification: notification ? {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.notificationType
      } : null,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      articleAccessInfo: {
        accessibleArticlesCount,
        message: `You now have access to latest ${accessibleArticlesCount} articles published before ${startDate.toLocaleDateString()} and all future articles`
      }
    });

  } catch (error) {
    console.error('Error creating subscription:', error);

    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed: ' + error.message },
      { status: 500 }
    );
  }
}