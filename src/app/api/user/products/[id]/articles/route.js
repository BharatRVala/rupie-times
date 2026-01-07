import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product, { ProductReadingProgress } from '@/app/lib/models/product';
import Subscription from '@/app/lib/models/Subscription';
import User from '@/app/lib/models/User';
import Admin from '@/app/lib/models/Admin';
import { authenticateUser } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    // Authenticate User
    const authResult = authenticateUser(request);
    const userId = authResult.success ? authResult.id : null;

    // 1. Fetch Subscription (if user exists)
    let hasAccess = false;
    let subscription = null;
    let effectiveStartDate = null;
    let historicalArticleLimit = 5;

    if (userId) {
      // Find the *latest active* subscription
      const activeSub = await Subscription.findOne({
        user: userId,
        product: id,
        status: { $in: ['active', 'expiresoon'] },
        endDate: { $gt: new Date() },
        paymentStatus: 'completed'
      })
        .sort({ endDate: -1 })
        .lean(); // Use lean()

      if (activeSub) {
        hasAccess = true;
        subscription = activeSub;
        historicalArticleLimit = activeSub.historicalArticleLimit || 5;
        effectiveStartDate = activeSub.startDate; // Default to current start

        // ----------------------------------------------------------------
        // ENHANCED CONTIGUOUS RENEWAL LOGIC
        // ----------------------------------------------------------------
        try {
          if (activeSub.contiguousChainId) {
            // Find all subscriptions in the same contiguous chain
            const chainSubscriptions = await Subscription.find({
              user: userId,
              product: id,
              paymentStatus: 'completed',
              contiguousChainId: activeSub.contiguousChainId
            })
              .sort({ startDate: 1 }) // Sort by start date ascending
              .select('startDate endDate originalStartDate')
              .lean();

            if (chainSubscriptions.length > 0) {
              // Find the earliest start date in the chain
              const earliestSubscription = chainSubscriptions[0];
              effectiveStartDate = earliestSubscription.originalStartDate || earliestSubscription.startDate;

              // console.log(`🔗 Contiguous chain found: ${chainSubscriptions.length} subscriptions`);
              // console.log(`   Chain start: ${effectiveStartDate}`);
            } else {
              // No chain found (unexpected if ID exists), fallback
              effectiveStartDate = activeSub.originalStartDate || activeSub.startDate;
              // console.log(`📅 Chain ID used but no history found, using subscription start: ${effectiveStartDate}`);
            }
          } else {
            // Legacy or Fresh subscription with no chain ID
            // Trust the 'originalStartDate' field if we backfilled it or it was set
            effectiveStartDate = activeSub.originalStartDate || activeSub.startDate;
            // console.log(`📅 No chain ID, using subscription start: ${effectiveStartDate}`);
          }
        } catch (err) {
          console.warn('Error tracing subscription chain:', err);
          effectiveStartDate = activeSub.originalStartDate || activeSub.startDate;
        }
      }
    }

    // 2. Fetch Product Stats (Basic Info) & Validate
    // Use projection to avoid loading heavy 'articles' array yet
    const productBasic = await Product.findById(id)
      .select('heading shortDescription isActive articles variants')
      .lean();

    if (!productBasic || !productBasic.isActive) {
      return NextResponse.json(
        { success: false, error: 'Product not found or inactive' },
        { status: 404 }
      );
    }

    // Quick check on raw articles
    const rawArticleCount = productBasic.articles ? productBasic.articles.length : 0;
    const rawActiveArticles = productBasic.articles ? productBasic.articles.filter(a => a.isActive).length : 0;


    // If NO ACCESS, return early with empty articles
    if (!hasAccess) {
      return NextResponse.json({
        success: true,
        product: {
          id: productBasic._id.toString(),
          heading: productBasic.heading,
          shortDescription: productBasic.shortDescription,
          variants: productBasic.variants
        },
        articles: [],
        hasAccess: false,
        subscription: null,
        accessInfo: { message: 'Active subscription required to access articles' }
      });
    }

    // 3. AGGREGATION PIPELINE to fetch Articles
    // We need:
    //  - Future: createdAt > effectiveStartDate
    //  - Historical: createdAt <= effectiveStartDate (Sort DESC, Limit N)

    // We must manually cast ID to ObjectId for aggregation
    const productIdObj = new mongoose.Types.ObjectId(id);
    const startDateObj = new Date(effectiveStartDate);

    const pipeline = [
      { $match: { _id: productIdObj } },

      // Unwind articles - this explodes the array so we can filter stream
      { $unwind: '$articles' },

      // Filter: Active articles only
      { $match: { 'articles.isActive': true } },

      // Ensure createdAt exists
      { $match: { 'articles.createdAt': { $exists: true } } },

      // ✅ OPTIMIZATION: Exclude heavy contentBlocks to reduce payload size
      {
        $project: {
          'articles.sections.contentBlocks': 0,
          'articles.sections.createdAt': 0,
          'articles.sections.updatedAt': 0
        }
      },

      // Use $facet to run two independent pipelines on the same stream
      {
        $facet: {
          // Pipeline A: Future Articles
          futureArticles: [
            { $match: { 'articles.createdAt': { $gt: startDateObj } } },
            { $sort: { 'articles.createdAt': -1 } }, // Newest first
            { $addFields: { 'articles.articleType': 'future' } }
            // No limit for future articles typically
          ],

          // Pipeline B: Historical Articles
          historicalArticles: [
            { $match: { 'articles.createdAt': { $lte: startDateObj } } },
            { $sort: { 'articles.createdAt': -1 } }, // Newest first (critical for "Latest N")
            { $limit: historicalArticleLimit },      // Apply Limit Here
            { $addFields: { 'articles.articleType': 'historical' } }
          ]
        }
      }
    ];

    const aggregationResult = await Product.aggregate(pipeline);

    // Extract results (Aggregation returns an array with one doc due to $facet on one ID)
    const facetedResult = aggregationResult[0] || { futureArticles: [], historicalArticles: [] };

    // Combine both lists
    let allRawArticles = [
      ...(facetedResult.futureArticles || []).map(item => item.articles),
      ...(facetedResult.historicalArticles || []).map(item => item.articles)
    ];

    // Sort combined result by date descending
    allRawArticles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 4, 5. Fetch User Favorites and Reading Progress in Parallel
    const articleIds = allRawArticles.map(a => a._id);
    let favoritesSet = new Set();
    let progressMap = new Map();

    if (userId) {
      const [userDoc, progresses] = await Promise.all([
        User.findById(userId).select('favorites.articles favorites.freeArticles').lean(),
        articleIds.length > 0 ? ProductReadingProgress.find({
          userId: userId,
          productId: id,
          articleId: { $in: articleIds }
        }).lean() : Promise.resolve([])
      ]);

      if (userDoc?.favorites?.articles) {
        userDoc.favorites.articles.forEach(fav => {
          if (fav.articleId) favoritesSet.add(fav.articleId.toString());
        });
      }

      if (progresses) {
        progresses.forEach(p => progressMap.set(p.articleId.toString(), p));
      }
    }

    // 6. Format Final Response
    // 6a. Pre-fetch author names if they are emails
    let authorMap = new Map();
    const uniqueAuthors = [...new Set(allRawArticles.map(a => a.author).filter(a => a && a.includes('@')))];

    if (uniqueAuthors.length > 0) {
      try {
        const admins = await Admin.find({ email: { $in: uniqueAuthors } }).select('email name');
        admins.forEach(a => authorMap.set(a.email, a.name));
      } catch (err) {
        console.error('Error fetching author names:', err);
      }
    }

    const formattedArticles = allRawArticles.map(article => {
      const articleIdStr = article._id.toString();
      const progress = progressMap.get(articleIdStr);

      let simplifiedProgress = {
        readPercentage: 0,
        completed: false,
        readSectionsCount: 0,
        totalSections: article.sections ? article.sections.length : 0,
        progressText: `0/${article.sections ? article.sections.length : 0}`,
        hasProgress: false
      };

      if (progress) {
        const totalSections = article.sections ? article.sections.length : 0;
        const readCount = progress.readSections ? progress.readSections.length : 0; // naive count, can refine if needed
        const pct = totalSections > 0 ? Math.round((readCount / totalSections) * 100) : 0;

        simplifiedProgress = {
          readPercentage: Math.min(100, pct),
          completed: progress.completed || false,
          readSectionsCount: readCount,
          totalSections: totalSections,
          progressText: `${readCount}/${totalSections}`,
          hasProgress: true
        };
      }

      // Resolve author name if it's an email
      let displayAuthor = article.author;
      if (article.author && article.author.includes('@')) {
        displayAuthor = authorMap.get(article.author) || article.author;
      }

      return {
        _id: articleIdStr,
        mainHeading: article.mainHeading,
        description: article.description,
        author: displayAuthor,
        category: article.category,
        image: article.image,
        publishDate: article.createdAt,
        createdAt: article.createdAt,
        issueDate: article.issueDate,
        issueEndDate: article.issueEndDate,
        sectionsCount: article.sections ? article.sections.length : 0,
        hasAccess: true, // List is already filtered to accessible
        articleType: article.articleType, // Added in pipeline
        isFavorite: favoritesSet.has(articleIdStr),
        readingProgress: simplifiedProgress
      };
    });

    const historicalCount = formattedArticles.filter(a => a.articleType === 'historical').length;
    const futureCount = formattedArticles.filter(a => a.articleType === 'future').length;

    // console.log(`✅ Aggregation API Success: ${formattedArticles.length} articles (H:${historicalCount}, F:${futureCount})`);

    return NextResponse.json({
      success: true,
      product: {
        id: productBasic._id.toString(),
        heading: productBasic.heading,
        shortDescription: productBasic.shortDescription,
        variants: productBasic.variants
      },
      articles: formattedArticles,
      hasAccess: true,
      subscription: {
        id: subscription._id.toString(),
        endDate: subscription.endDate,
        daysRemaining: Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)),
        status: subscription.status,
        startDate: subscription.startDate,
        startDateIndian: new Date(subscription.startDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      },
      accessInfo: {
        totalArticles: rawArticleCount,
        activeArticles: rawActiveArticles,
        accessibleArticles: formattedArticles.length,
        subscriptionStart: subscription.startDate,
        effectiveStartDate: effectiveStartDate,
        lookBackCount: historicalArticleLimit,
        historicalArticles: historicalCount,
        futureArticles: futureCount,
        message: 'Access granted via subscription'
      }
    });

  } catch (error) {
    console.error('❌ Error in product articles API (Aggregation):', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch articles: ' + error.message },
      { status: 500 }
    );
  }
}