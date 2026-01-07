// src/app/lib/middleware/auth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

/* ============================================================
   ✅ Authenticate Admin (admin + super_admin)
   ============================================================ */
export function authenticateAdmin(req) {
  try {
    const token = req.cookies?.get('admin_token')?.value;

    if (!token) {
      return {
        success: false,
        error: 'Admin token not found',
        status: 401
      };
    }

    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);

    if (!['admin', 'super_admin'].includes(decoded.role)) {
      return {
        success: false,
        error: 'Admin access required',
        status: 403
      };
    }

    return {
      success: true,
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      permissions: decoded.permissions || {}
    };
  } catch (error) {
    console.error('Admin authentication error:', error);
    return {
      success: false,
      error: `Admin authentication failed: ${error.message}`,
      status: 401
    };
  }
}

/* ============================================================
   ✅ Authenticate Normal User
   ============================================================ */
export function authenticateUser(req) {
  try {
    const token = req.cookies?.get('user_token')?.value;

    if (!token) {
      return {
        success: false,
        error: 'User token not found',
        status: 401
      };
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'user') {
      return {
        success: false,
        error: 'User access required',
        status: 403
      };
    }

    return {
      success: true,
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role
    };
  } catch (error) {
    console.error('User authentication error:', error);
    return {
      success: false,
      error: `User authentication failed: ${error.message}`,
      status: 401
    };
  }
}

/* ============================================================
   ✅ Authenticate Super Admin Only
   ============================================================ */
export function authenticateSuperAdmin(req) {
  try {
    const token = req.cookies?.get('admin_token')?.value;

    if (!token) {
      return {
        success: false,
        error: 'Admin token not found',
        status: 401
      };
    }

    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);

    if (decoded.role !== 'super_admin') {
      return {
        success: false,
        error: 'Super admin access required',
        status: 403
      };
    }

    return {
      success: true,
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      permissions: decoded.permissions || {}
    };
  } catch (error) {
    console.error('Super admin authentication error:', error);
    return {
      success: false,
      error: `Super admin authentication failed: ${error.message}`,
      status: 401
    };
  }
}

/* ============================================================
   ✅ checkSubscriptionAccess (with async import fix)
   ============================================================ */
export async function checkSubscriptionAccess(userId, productId) {
  try {
    // ✅ FIXED: use await import (Dynamic import required in Next.js App Router)
    const Subscription = (await import('@/app/lib/models/Subscription')).default;

    // Find only latest valid subscription
    const activeSubscription = await Subscription.findOne({
      user: userId,
      product: productId,
      status: { $in: ['active', 'expiresoon'] },
      endDate: { $gt: new Date() },
      paymentStatus: 'completed',
      isLatest: true
    }).populate('product', 'heading shortDescription');

    return {
      hasAccess: !!activeSubscription,
      subscription: activeSubscription
    };
  } catch (error) {
    console.error('Subscription check error:', error);
    return {
      hasAccess: false,
      subscription: null
    };
  }
}

