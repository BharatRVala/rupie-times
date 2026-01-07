// src/app/api/user/debug/subscriptions/route.js
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Subscription from '@/app/lib/models/Subscription';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function GET(request) {
  try {
    const authResult = authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error 
        }, 
        { status: authResult.status }
      );
    }

    // Your dbConnect.js already handles the connection pooling
    
    const userSubscriptions = await Subscription.find({
      user: authResult.user.id
    })
    .populate('product', 'heading shortDescription category')
    .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      user: {
        id: authResult.user.id,
        email: authResult.user.email
      },
      subscriptions: userSubscriptions.map(sub => ({
        id: sub._id.toString(),
        product: sub.product ? {
          id: sub.product._id.toString(),
          heading: sub.product.heading,
          shortDescription: sub.product.shortDescription,
          category: sub.product.category
        } : null,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        paymentStatus: sub.paymentStatus,
        cancelledAt: sub.cancelledAt,
        isActive: sub.status === 'active' && new Date(sub.endDate) > new Date(),
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching debug subscriptions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch subscriptions: ' + error.message 
      }, 
      { status: 500 }
    );
  }
}