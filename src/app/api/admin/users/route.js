import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import User from '@/app/lib/models/User';
import DeletedUser from '@/app/lib/models/deletedUser';
import mongoose from 'mongoose';
import Subscription from '@/app/lib/models/Subscription';
import Product, { ProductReadingProgress } from '@/app/lib/models/product';
import FreeArticle, { ReadingProgress } from '@/app/lib/models/article';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import bcrypt from 'bcryptjs';

// Helper function to calculate progress (reused from user stats)
async function calculateUserProgress(userId) {
  try {
    let subTotalArticles = 0;
    let subCompletedArticles = 0;

    const activeSubscriptions = await Subscription.find({
      user: userId,
      status: { $in: ['active', 'expiresoon'] },
      endDate: { $gt: new Date() }
    }).lean();

    if (activeSubscriptions.length > 0) {
      for (const sub of activeSubscriptions) {
        const productId = sub.product;
        let effectiveStartDate = sub.startDate;
        const historicalArticleLimit = sub.historicalArticleLimit || 5;

        // Chain logic simplified for admin view speed
        if (sub.contiguousChainId) {
          const earliestChainSub = await Subscription.findOne({
            user: userId,
            product: productId,
            paymentStatus: 'completed',
            contiguousChainId: sub.contiguousChainId
          })
            .sort({ startDate: 1 })
            .select('startDate originalStartDate')
            .lean();

          if (earliestChainSub) effectiveStartDate = earliestChainSub.originalStartDate || earliestChainSub.startDate;
        }
        else {
          effectiveStartDate = sub.originalStartDate || sub.startDate;
        }


        const startDateObj = new Date(effectiveStartDate);
        const productIdObj = new mongoose.Types.ObjectId(productId);

        const pipeline = [
          { $match: { _id: productIdObj } },
          { $unwind: '$articles' },
          { $match: { 'articles.isActive': true, 'articles.createdAt': { $exists: true } } },
          {
            $facet: {
              futureArticles: [
                { $match: { 'articles.createdAt': { $gt: startDateObj } } },
                { $project: { _id: '$articles._id' } }
              ],
              historicalArticles: [
                { $match: { 'articles.createdAt': { $lte: startDateObj } } },
                { $sort: { 'articles.createdAt': -1 } },
                { $limit: historicalArticleLimit },
                { $project: { _id: '$articles._id' } }
              ]
            }
          }
        ];

        const aggregationResult = await Product.aggregate(pipeline);
        const result = aggregationResult[0] || { futureArticles: [], historicalArticles: [] };
        const accessibleArticleIds = [...(result.futureArticles || []).map(a => a._id), ...(result.historicalArticles || []).map(a => a._id)];

        subTotalArticles += accessibleArticleIds.length;

        if (accessibleArticleIds.length > 0) {
          const realCompletedAgg = await ProductReadingProgress.aggregate([
            {
              $match: {
                userId: new mongoose.Types.ObjectId(userId),
                productId: productIdObj,
                articleId: { $in: accessibleArticleIds }
              }
            },
            {
              $lookup: {
                from: 'products',
                localField: 'productId',
                foreignField: '_id',
                as: 'product'
              }
            },
            { $unwind: '$product' },
            {
              $addFields: {
                targetArticle: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$product.articles',
                        as: 'art',
                        cond: { $eq: ['$$art._id', '$articleId'] }
                      }
                    },
                    0
                  ]
                }
              }
            },
            {
              $project: {
                readCount: { $size: { $ifNull: ['$readSections', []] } },
                totalCount: { $size: { $ifNull: ['$targetArticle.sections', []] } }
              }
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $gt: ['$totalCount', 0] },
                    { $gte: ['$readCount', '$totalCount'] }
                  ]
                }
              }
            },
            { $count: 'count' }
          ]);
          subCompletedArticles += (realCompletedAgg.length > 0 ? realCompletedAgg[0].count : 0);
        }
      }
    }

    const freeTotalArticles = await FreeArticle.countDocuments({
      isActive: true,
      accessType: { $in: ['withoutlogin', 'login'] }
    });

    const freeCompletedAgg = await ReadingProgress.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: 'freearticles',
          localField: 'articleId',
          foreignField: '_id',
          as: 'article'
        }
      },
      { $unwind: '$article' },
      { $match: { 'article.isActive': true } },
      {
        $project: {
          readCount: { $size: { $ifNull: ['$readSections', []] } },
          totalCount: { $size: { $ifNull: ['$article.sections', []] } }
        }
      },
      {
        $match: {
          $expr: {
            $and: [
              { $gt: ['$totalCount', 0] },
              { $gte: ['$readCount', '$totalCount'] }
            ]
          }
        }
      },
      { $count: 'count' }
    ]);

    const freeCompletedArticles = freeCompletedAgg.length > 0 ? freeCompletedAgg[0].count : 0;

    const totalArticles = subTotalArticles + freeTotalArticles;
    const completedArticles = subCompletedArticles + freeCompletedArticles;

    return totalArticles > 0 ? Math.round((completedArticles / totalArticles) * 100) : 0;

  } catch (error) {
    console.error(`Progress calc error for user ${userId}:`, error);
    return 0;
  }
}



// ✅ POST - Create new user (Admin only)
export async function POST(request) {
  try {
    const authResult = authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    await connectDB();

    const body = await request.json();
    const { name, email, mobile, password } = body;

    // Validate required fields
    if (!name || !email || !mobile || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, mobile and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { mobile }],
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "User with this email or mobile number already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      name,
      email,
      mobile,
      password: hashedPassword,
      role: 'user',
      isActive: true
    });

    const userResponse = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      mobile: newUser.mobile,
      role: newUser.role,
      isActive: newUser.isActive,
      joinedDate: new Date(newUser.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      progress: 0,
      status: 'active'
    };

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: userResponse
    });

  } catch (error) {
    console.error("Create user error:", error);
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "User with this email or mobile already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Failed to create user: " + error.message }, { status: 500 });
  }
}


export async function GET(request) {
  try {
    await connectDB();

    const admin = authenticateAdmin(request);
    if (!admin.success) {
      // Handle auth failure if needed
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const skip = (page - 1) * limit;

    let searchQuery = {};

    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } }
      ];
    }

    let users = [];
    let total = 0;

    // ✅ Unified Fetch: Get ALL users (Active & Deleted) + Sub Status
    if (status === 'unified') {
      // 1. Fetch Active Users
      const activeUsers = await User.find(searchQuery).select('-password').sort({ createdAt: -1 }).lean();

      // 2. Fetch Deleted Users
      const deletedUsers = await DeletedUser.find(searchQuery).sort({ deletedAt: -1 }).lean();

      // 3. Fetch Latest Subscriptions for Status Logic
      const latestSubs = await Subscription.find({ isLatest: true }).select('user status endDate').lean();

      const subStatusMap = {};
      latestSubs.forEach(sub => {
        if (sub.user) {
          const userId = sub.user._id ? sub.user._id.toString() : sub.user.toString();
          subStatusMap[userId] = sub;
        }
      });

      // 4. Map Active Users
      const mappedActive = await Promise.all(activeUsers.map(async (user) => {
        // Progress is heavy, but needed for 'active' tab visual. Calculate or defaut to 0 if too heavy?
        // Using the existing function 
        const progress = await calculateUserProgress(user._id);
        const sub = subStatusMap[user._id.toString()];

        let subscriptionStatus = 'none';
        if (sub) {
          // Strictly align with stats API status for consistency
          if (sub.status === 'active') subscriptionStatus = 'active';
          else if (sub.status === 'expiresoon') subscriptionStatus = 'expiresoon';
          else if (sub.status === 'expired') subscriptionStatus = 'expired';
        }

        return {
          id: user._id.toString(),
          userName: user.name,
          firstName: user.name,
          email: user.email,
          phone: user.mobile,
          role: user.role,
          status: 'active',
          joinedDate: new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          createdAt: user.createdAt,
          progress: progress,
          isActive: true,
          subscriptionStatus: subscriptionStatus,
          subscriptionObj: sub // Debug info
        };
      }));

      // 5. Map Deleted Users
      const mappedDeleted = deletedUsers.map(user => {
        const sub = subStatusMap[user._id.toString()] || (user.originalUserId ? subStatusMap[user.originalUserId.toString()] : null);
        let subscriptionStatus = 'none';
        if (sub) {
          if (sub.status === 'active') subscriptionStatus = 'active';
          else if (sub.status === 'expiresoon') subscriptionStatus = 'expiresoon';
          else if (sub.status === 'expired') subscriptionStatus = 'expired';
        }

        return {
          id: user._id.toString(),
          userName: user.name,
          firstName: user.name,
          email: user.email,
          phone: user.mobile,
          role: user.role,
          status: 'deleted',
          joinedDate: user.deletedAt ? new Date(user.deletedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
          createdAt: user.createdAt,
          progress: 0,
          isActive: false,
          subscriptionStatus: subscriptionStatus
        };
      });

      // Combine
      users = [...mappedActive, ...mappedDeleted];
      // Sort by latest interactions usually? or joined date.
      users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      total = users.length;

      // Slice if limit provided (but unified usually implies separate handling, here we return all if limit is huge)
      if (limit < total) {
        users = users.slice(skip, skip + limit);
      }

    } else if (status === 'deleted') {
      // ... (Existing logic for fallback)
      const deletedUsers = await DeletedUser.find(searchQuery)
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(limit);

      total = await DeletedUser.countDocuments(searchQuery);

      users = deletedUsers.map(user => ({
        id: user._id.toString(),
        userName: user.name,
        firstName: user.name,
        email: user.email,
        phone: user.mobile,
        role: user.role,
        status: 'deleted',
        joinedDate: user.deletedAt ? new Date(user.deletedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
        progress: 0,
        isActive: false
      }));

    } else if (['subscription_active', 'subscription_expiresoon', 'subscription_expired'].includes(status)) {
      // ... (Existing logic)
      // Keeping existing logic as safeguard, but frontend will mostly use unified
      const subStatusMap = {
        'subscription_active': 'active',
        'subscription_expiresoon': 'expiresoon',
        'subscription_expired': 'expired'
      };
      const dbStatus = subStatusMap[status];

      const subscriptions = await Subscription.find({
        status: dbStatus,
        isLatest: true
      }).select('user').lean();

      const userIds = subscriptions.map(sub => sub.user);

      const [foundActiveUsers, foundDeletedUsers] = await Promise.all([
        User.find({ ...searchQuery, _id: { $in: userIds } }).select('-password').lean(),
        DeletedUser.find({ ...searchQuery, originalUserId: { $in: userIds } }).lean()
      ]);

      const formattedActive = await Promise.all(foundActiveUsers.map(async (user) => {
        const progress = await calculateUserProgress(user._id);
        return {
          id: user._id.toString(),
          userName: user.name,
          firstName: user.name,
          email: user.email,
          phone: user.mobile,
          role: user.role,
          status: 'active',
          joinedDate: new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          createdAt: user.createdAt,
          progress: progress,
          isActive: true
        };
      }));

      const formattedDeleted = foundDeletedUsers.map(user => ({
        id: user._id.toString(),
        userName: user.name,
        firstName: user.name,
        email: user.email,
        phone: user.mobile,
        role: user.role,
        status: 'deleted',
        joinedDate: user.deletedAt ? new Date(user.deletedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
        createdAt: user.createdAt,
        progress: 0,
        isActive: false
      }));

      let allFoundUsers = [...formattedActive, ...formattedDeleted];
      allFoundUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      total = allFoundUsers.length;
      users = allFoundUsers.slice(skip, skip + limit);

    } else {
      // Active Users (Standard)
      if (status === 'active') searchQuery.isActive = true;

      const activeUsers = await User.find(searchQuery)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      total = await User.countDocuments(searchQuery);

      users = await Promise.all(activeUsers.map(async (user) => {
        const progress = await calculateUserProgress(user._id);
        return {
          id: user._id.toString(),
          userName: user.name,
          firstName: user.name,
          email: user.email,
          phone: user.mobile,
          role: user.role,
          status: user.isActive ? 'active' : 'deleted',
          joinedDate: new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          progress: progress,
          isActive: user.isActive
        };
      }));
    }

    return NextResponse.json({
      success: true,
      users: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    if (error.message.includes('authentication failed')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}