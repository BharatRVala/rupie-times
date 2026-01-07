import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Subscription from '@/app/lib/models/Subscription';
import Product from '@/app/lib/models/product';
import { authenticateUser } from '@/app/lib/middleware/auth';
import mongoose from 'mongoose';

export async function POST(request) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Authenticate user
        const authResult = authenticateUser(request);
        if (!authResult.success) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectDB();

        const body = await request.json();
        const { subscriptionId, duration, paymentMethod = 'razorpay', paymentId, transactionId } = body;

        if (!subscriptionId || !duration) {
            return NextResponse.json(
                { success: false, error: 'Subscription ID and duration are required' },
                { status: 400 }
            );
        }

        // Find existing subscription
        const existingSubscription = await Subscription.findById(subscriptionId)
            .populate('product')
            .session(session);

        if (!existingSubscription) {
            return NextResponse.json(
                { success: false, error: 'Subscription not found' },
                { status: 404 }
            );
        }

        // Verify user owns this subscription
        if (existingSubscription.user.toString() !== authResult.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized access to this subscription' },
                { status: 403 }
            );
        }

        // Check if subscription can be renewed
        const now = new Date();
        const isExpired = existingSubscription.status === 'expired';
        const isExpiringSoon = existingSubscription.status === 'expiresoon';
        const isActive = existingSubscription.status === 'active';

        if (!isExpired && !isExpiringSoon && !isActive) {
            return NextResponse.json(
                { success: false, error: 'Subscription cannot be renewed in its current state' },
                { status: 400 }
            );
        }

        // Find product and variant
        const product = await Product.findById(existingSubscription.product)
            .session(session);

        if (!product || !product.isActive) {
            return NextResponse.json(
                { success: false, error: 'Product not available for renewal' },
                { status: 404 }
            );
        }

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

        // ✅ CRITICAL: Check renewal contiguity logic
        // We can reuse the static method or implement similar logic here
        let startDate = new Date();
        let coverageStartDate = new Date(startDate);
        let isContiguousRenewal = false;
        let effectiveStartDate = existingSubscription.originalStartDate || existingSubscription.startDate;

        // Renewing before expiry - contiguous
        if (existingSubscription.endDate > now) {
            // startDate = existingSubscription.endDate; <--- REMOVED
            coverageStartDate = existingSubscription.endDate;
            startDate = existingSubscription.endDate; // Set start date to future
            isContiguousRenewal = true;
            // console.log(`🔄 Contiguous renewal from existing end date: ${coverageStartDate}`);
        } else {
            // Renewing after expiry - check gap
            const gapInDays = Math.ceil((now - existingSubscription.endDate) / (1000 * 60 * 60 * 24));

            // Strict rule: only allow very small grace period  (7 days now)
            if (gapInDays <= 7) {
                // Within grace period - still contiguous
                // startDate = now; <--- ALREADY NOW
                coverageStartDate = now;
                isContiguousRenewal = true;
                // console.log(`🔄 Renewal within grace period (${gapInDays} days gap)`);
            } else {
                // Gap too large - fresh purchase
                // startDate = now; <--- ALREADY NOW
                coverageStartDate = now;
                isContiguousRenewal = false;
                effectiveStartDate = now; // Reset history
                // console.log(`🔄 Fresh purchase after ${gapInDays} days gap`);
            }
        }

        // Calculate end date based on coverage start
        let endDate = new Date(coverageStartDate);

        switch (variant.durationUnit) {
            case 'minutes':
                endDate.setMinutes(endDate.getMinutes() + variant.durationValue);
                break;
            case 'hours':
                endDate.setHours(endDate.getHours() + variant.durationValue);
                break;
            case 'days':
                endDate.setDate(endDate.getDate() + variant.durationValue);
                break;
            case 'weeks':
                endDate.setDate(endDate.getDate() + (variant.durationValue * 7));
                break;
            case 'months':
                endDate.setMonth(endDate.getMonth() + variant.durationValue);
                break;
            case 'years':
                endDate.setFullYear(endDate.getFullYear() + variant.durationValue);
                break;
            default:
                endDate.setMonth(endDate.getMonth() + 1);
        }

        // Mark old subscription as not latest
        existingSubscription.isLatest = false;
        await existingSubscription.save({ session });

        // Generate contiguous chain ID
        const contiguousChainId = isContiguousRenewal ?
            (existingSubscription.contiguousChainId || Subscription.generateContiguousChainId(authResult.id, product._id)) :
            Subscription.generateContiguousChainId(authResult.id, product._id);

        // Create new subscription
        const newSubscription = new Subscription({
            user: authResult.id,
            product: product._id,
            variant: {
                duration: variant.duration,
                durationValue: variant.durationValue,
                durationUnit: variant.durationUnit,
                price: variant.price
            },
            isRenewal: true,
            renewedFrom: existingSubscription._id,
            originalStartDate: effectiveStartDate, // This maintains historical access
            contiguousChainId: contiguousChainId,
            status: 'active',
            paymentStatus: 'completed',
            paymentId: paymentId,
            transactionId: transactionId,
            startDate: startDate,
            endDate: endDate,
            isLatest: true,
            metadata: {
                renewalType: isContiguousRenewal ? 'contiguous' : 'fresh',
                previousSubscriptionId: existingSubscription._id,
                gapInDays: Math.ceil((startDate - existingSubscription.endDate) / (1000 * 60 * 60 * 24)),
                originalPurchaseDate: existingSubscription.originalStartDate || existingSubscription.startDate
            }
        });

        await newSubscription.save({ session });

        // Calculate accessible articles (Optional checks for response)
        const accessibleArticles = product.getAccessibleArticles ?
            product.getAccessibleArticles(effectiveStartDate, 5) : [];

        const historicalArticles = accessibleArticles.filter(article =>
            new Date(article.createdAt) <= effectiveStartDate
        );
        const futureArticles = accessibleArticles.filter(article =>
            new Date(article.createdAt) > effectiveStartDate
        );

        await session.commitTransaction();

        return NextResponse.json({
            success: true,
            message: isContiguousRenewal ? 'Subscription renewed contiguously' : 'New subscription created',
            subscription: {
                id: newSubscription._id,
                product: {
                    _id: product._id,
                    heading: product.heading,
                    shortDescription: product.shortDescription
                },
                variant: newSubscription.variant,
                status: newSubscription.status,
                startDate: newSubscription.startDate,
                endDate: newSubscription.endDate,
                originalStartDate: newSubscription.originalStartDate,
                isRenewal: newSubscription.isRenewal,
                isContiguousRenewal: isContiguousRenewal,
                gapInDays: newSubscription.metadata.gapInDays
            },
            articleAccess: {
                totalArticles: accessibleArticles.length,
                historicalArticles: historicalArticles.length,
                futureArticles: futureArticles.length,
                effectiveStartDate: effectiveStartDate,
                lookBackCount: 5,
                message: isContiguousRenewal ?
                    `Maintained access to ${historicalArticles.length} historical articles and ${futureArticles.length} future articles` :
                    `Fresh access to ${historicalArticles.length} historical articles and all future articles`
            },
            previousSubscription: {
                id: existingSubscription._id,
                status: existingSubscription.status,
                endDate: existingSubscription.endDate
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Renewal error:', error);

        return NextResponse.json(
            { success: false, error: 'Renewal failed: ' + error.message },
            { status: 500 }
        );
    } finally {
        session.endSession();
    }
}
