// src/app/api/user/payments/[id]/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Payment from '@/app/lib/models/Payment';
import Subscription from '@/app/lib/models/Subscription';
import Product from '@/app/lib/models/product';
import User from '@/app/lib/models/User';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function GET(request, { params }) {
    try {
        const user = authenticateUser(request);

        if (!user.success) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;

        // Try finding by Razorpay Order ID (most common url param) or _id
        let payment = await Payment.findOne({
            razorpayOrderId: id,
            user: user.id
        })
            .populate({
                path: 'subscriptions',
                populate: {
                    path: 'product',
                    select: 'heading shortDescription filename category',
                    model: Product
                }
            })
            .lean();

        if (!payment) {
            // Try by _id if ObjectId compatible
            if (id.match(/^[0-9a-fA-F]{24}$/)) {
                payment = await Payment.findOne({
                    _id: id,
                    user: user.id
                })
                    .populate({
                        path: 'subscriptions',
                        populate: {
                            path: 'product',
                            select: 'heading shortDescription filename category',
                            model: Product
                        }
                    })
                    .lean();
            }
        }

        if (!payment) {
            return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
        }

        // Ensure decimal values are numbers for JSON
        const formatDecimal = (val) => {
            if (val && val._bsontype === 'Decimal128') return parseFloat(val.toString());
            return val;
        };

        const formattedPayment = {
            ...payment,
            amount: formatDecimal(payment.amount),
            amountInPaise: formatDecimal(payment.amountInPaise),
            metadata: {
                ...payment.metadata,
                subtotal: formatDecimal(payment.metadata?.subtotal),
                taxAmount: formatDecimal(payment.metadata?.taxAmount),
                totalInRupees: formatDecimal(payment.metadata?.totalInRupees),
                totalInPaise: formatDecimal(payment.metadata?.totalInPaise)
            },
            // Enhance subscriptions with product details from cartItems if needed
            cartItems: payment.metadata?.cartItems || []
        };

        // Fetch full user details to include mobile
        const dbUser = await User.findById(user.id).select('name email mobile');

        return NextResponse.json({
            success: true,
            payment: formattedPayment,
            user: dbUser ? {
                id: dbUser._id,
                name: dbUser.name,
                email: dbUser.email,
                mobile: dbUser.mobile
            } : {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Error fetching payment details:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch order details: ' + error.message }, { status: 500 });
    }
}
