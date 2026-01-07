// src/app/api/user/products/[id]/articles/[articleId]/route.js - COMPLETE WORKING VERSION
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product, { ProductReadingProgress } from '@/app/lib/models/product';
import Subscription from '@/app/lib/models/Subscription';
import User from '@/app/lib/models/User';
import Admin from '@/app/lib/models/Admin';
import { authenticateUser, checkSubscriptionAccess } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';

export async function GET(request, { params }) {
  try {
    const { id, articleId } = await params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(articleId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid product ID or article ID'
        },
        { status: 400 }
      );
    }

    // Authenticate user
    const authResult = authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required'
        },
        { status: 401 }
      );
    }

    await dbConnect();

    // console.log(`📖 Article access request: User ${authResult.id}, Product ${id}, Article ${articleId}`);

    // ✅ FIRST: Find the user's latest subscription
    let subscription = await Subscription.findOne({
      user: authResult.id,
      product: id,
      paymentStatus: 'completed',
      isLatest: true
    });

    let isTrialAccess = false;

    // If no active subscription, CHECK FOR TRIAL ACCESS
    if (!subscription || subscription.status === 'expired') {
      const user = await User.findById(authResult.id);
      const productToCheck = await Product.findById(id);
      const articleToCheck = productToCheck?.articles.id(articleId);

      // Check if User has Active Trial AND Article is Free Trial
      if (user?.trial?.isUsed && user.trial.endDate && new Date(user.trial.endDate) > new Date()) {
        if (articleToCheck?.isFreeTrial) {
          isTrialAccess = true;
          // Mock a subscription object for downstream logic compatibility
          subscription = {
            _id: 'TRIAL_ACCESS',
            status: 'active',
            startDate: user.trial.startDate,
            endDate: user.trial.endDate,
            isTrial: true
          };
        }
      }
    }

    if (!subscription && !isTrialAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active subscription found for this product',
          hasAccess: false
        },
        { status: 403 }
      );
    }

    // ✅ CRITICAL: Check if subscription has expired NOW (REAL-TIME CHECK) - Skip for Trial mock
    const now = new Date();
    const endDate = new Date(subscription.endDate);

    if (!isTrialAccess) {
      // If subscription has expired but status is not updated yet
      if (endDate <= now && subscription.status !== 'expired') {
        console.log(`❌ Subscription ${subscription._id} EXPIRED! Updating status...`);

        // Update status to expired immediately
        await Subscription.findByIdAndUpdate(subscription._id, {
          status: 'expired',
          lastStatusCheck: now
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Your subscription has expired. Please renew to access this content.',
            expired: true,
            subscriptionEnded: true
          },
          { status: 403 }
        );
      }

      // If subscription is already marked expired in DB
      if (subscription.status === 'expired') {
        return NextResponse.json(
          {
            success: false,
            error: 'Your subscription has expired. Please renew to access this content.',
            expired: true,
            subscriptionEnded: true
          },
          { status: 403 }
        );
      }

      // ✅ Check if subscription is actually active (including expiresoon)
      if (subscription.status !== 'active' && subscription.status !== 'expiresoon') {
        return NextResponse.json(
          {
            success: false,
            error: 'Subscription is not active',
            hasAccess: false
          },
          { status: 403 }
        );
      }
    }

    // ✅ Verify product exists
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found'
        },
        { status: 404 }
      );
    }

    // ✅ Find the article
    const article = product.articles.id(articleId);
    if (!article || !article.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article not found or inactive'
        },
        { status: 404 }
      );
    }

    // ✅ CONTIGUOUS ACCESS LOGIC
    let effectiveStartDate = subscription.startDate;

    if (subscription.contiguousChainId) {
      try {
        // Find earliest subscription in the chain
        const earliestSub = await Subscription.findOne({
          user: authResult.id,
          product: id,
          contiguousChainId: subscription.contiguousChainId
        }).sort({ startDate: 1 }); // Ascending order

        if (earliestSub) {
          effectiveStartDate = earliestSub.originalStartDate || earliestSub.startDate;
          // console.log(`🔗 Contiguous chain access: Using start date ${effectiveStartDate} from chain ${subscription.contiguousChainId}`);
        }
      } catch (err) {
        console.warn('Error tracing contiguous chain, using current subscription defaults:', err);
        effectiveStartDate = subscription.originalStartDate || subscription.startDate;
      }
    } else {
      // Fallback or legacy
      effectiveStartDate = subscription.originalStartDate || subscription.startDate;
    }

    // ✅ Check if article is accessible with this subscription
    const canAccessArticle = product.canAccessArticle(articleId, effectiveStartDate, subscription.historicalArticleLimit || 5);
    if (!canAccessArticle) {
      // console.log(`❌ Article ${articleId} not accessible with subscription starting ${subscription.startDate}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Article not accessible with your subscription',
          hasAccess: false
        },
        { status: 403 }
      );
    }

    // ✅ Get reading progress
    let processedProgress = null;
    try {
      const dbProgress = await ProductReadingProgress.getUserProgress(authResult.id, id, articleId);

      if (dbProgress) {
        const progressData = dbProgress.calculateProgress(article);

        processedProgress = {
          readSections: dbProgress.readSections || [],
          completed: progressData.completed,
          readPercentage: progressData.readPercentage,
          totalReadingTime: dbProgress.totalReadingTime || 0,
          lastReadAt: dbProgress.lastReadAt,
          readSectionsCount: progressData.readSectionsCount,
          totalSections: progressData.totalSections,
          progressText: progressData.progressText
        };

        // Save if completion status changed
        if (dbProgress.isModified && dbProgress.isModified()) {
          await dbProgress.save();
        }
      } else {
        // No progress yet - initialize
        processedProgress = {
          readSections: [],
          completed: false,
          readPercentage: 0,
          totalReadingTime: 0,
          lastReadAt: null,
          readSectionsCount: 0,
          totalSections: article.sections ? article.sections.length : 0,
          progressText: `0/${article.sections ? article.sections.length : 0}`
        };
      }
    } catch (progressError) {
      console.error('Error fetching reading progress:', progressError);
      processedProgress = {
        readSections: [],
        completed: false,
        readPercentage: 0,
        totalReadingTime: 0,
        lastReadAt: null,
        readSectionsCount: 0,
        totalSections: article.sections ? article.sections.length : 0,
        progressText: `0/${article.sections ? article.sections.length : 0}`
      };
    }

    // ✅ Prepare article data
    const populatedArticle = {
      _id: article._id.toString(),
      mainHeading: article.mainHeading || 'Untitled Article',
      description: article.description || 'No description available',
      category: article.category || 'Uncategorized',
      author: article.author || 'Unknown Author',
      image: article.image || null,
      isActive: article.isActive !== undefined ? article.isActive : true,
      createdAt: article.createdAt || new Date(),
      updatedAt: article.updatedAt || new Date(),
      sections: ((article.sections || [])).map(section => {
        try {
          return {
            _id: section._id ? section._id.toString() : new mongoose.Types.ObjectId().toString(),
            heading: section.heading,
            createdAt: section.createdAt || new Date(),
            updatedAt: section.updatedAt || new Date(),
            contentBlocks: ((section.contentBlocks || [])).map(block => {
              try {
                return {
                  _id: block._id ? block._id.toString() : new mongoose.Types.ObjectId().toString(),
                  blockType: block.blockType || 'paragraph',
                  content: block.content || '',
                  image: block.image ? {
                    filename: block.image.filename || '',
                    contentType: block.image.contentType || '',
                    size: block.image.size || 0,
                    gridfsId: block.image.gridfsId || ''
                  } : null,
                  listConfig: block.listConfig ? {
                    type: block.listConfig.type || 'bullet',
                    customSymbol: block.listConfig.customSymbol || '',
                    customImage: block.listConfig.customImage ? {
                      filename: block.listConfig.customImage.filename || '',
                      contentType: block.listConfig.customImage.contentType || '',
                      size: block.listConfig.customImage.size || 0,
                      gridfsId: block.listConfig.customImage.gridfsId || ''
                    } : null
                  } : undefined,
                  // ✅ FIX: Include linkConfig in the response
                  linkConfig: block.linkConfig ? {
                    url: block.linkConfig.url || '',
                    target: block.linkConfig.target || '_self',
                    title: block.linkConfig.title || ''
                  } : undefined,
                  style: block.style || {},
                  createdAt: block.createdAt || new Date(),
                  updatedAt: block.updatedAt || new Date()
                };
              } catch (blockError) {
                console.error('Error processing content block:', blockError);
                return {
                  _id: new mongoose.Types.ObjectId().toString(),
                  blockType: 'paragraph',
                  content: 'Error loading content',
                  image: null,
                  linkConfig: undefined,
                  style: {},
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
              }
            })
          };
        } catch (sectionError) {
          console.error('Error processing section:', sectionError);
          return {
            _id: new mongoose.Types.ObjectId().toString(),
            heading: 'Error loading section',
            createdAt: new Date(),
            updatedAt: new Date(),
            contentBlocks: []
          };
        }
      })
    };

    // ✅ Resolve Author Name if email
    if (populatedArticle.author && populatedArticle.author.includes('@')) {
      try {
        const adminAuthor = await Admin.findOne({ email: populatedArticle.author }).select('name').lean();
        if (adminAuthor) {
          populatedArticle.author = adminAuthor.name;
        }
      } catch (err) {
        console.warn('Error resolving author name:', err);
      }
    }

    const articleDate = new Date(article.createdAt || new Date());
    const subscriptionDate = new Date(subscription.startDate);
    const articleType = articleDate > subscriptionDate ? 'future' : 'historical';

    // ✅ Calculate time remaining for subscription
    const timeRemaining = endDate - now;
    const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.ceil(timeRemaining / (1000 * 60));

    const responseData = {
      success: true,
      article: populatedArticle,
      product: {
        _id: product._id.toString(),
        heading: product.heading || 'Unknown Product',
        shortDescription: product.shortDescription || '',
        category: product.category || 'Uncategorized'
      },
      userInfo: {
        isLoggedIn: true,
        user: {
          id: authResult.id,
          name: authResult.name || 'User',
          email: authResult.email
        }
      },
      readingProgress: processedProgress,
      subscription: {
        id: subscription._id.toString(),
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        hoursRemaining: hoursRemaining > 0 ? hoursRemaining : 0,
        minutesRemaining: minutesRemaining > 0 ? minutesRemaining : 0,
        isExpired: endDate <= now,
        isActive: subscription.status === 'active' || subscription.status === 'expiresoon',
        isExpiringSoon: subscription.status === 'expiresoon'
      },
      accessInfo: {
        isAccessible: true,
        subscriptionStartDate: subscription.startDate,
        articleCreatedAt: article.createdAt || new Date(),
        articleType: articleType,
        subscriptionExpired: endDate <= now,
        timeRemaining: timeRemaining > 0 ? timeRemaining : 0
      }
    };

    // console.log('✅ Article API Success:', {
    //   productId: id,
    //   articleId: articleId,
    //   articleTitle: article.mainHeading,
    //   subscriptionStatus: subscription.status,
    //   subscriptionEndDate: subscription.endDate.toISOString(),
    //   isExpired: endDate <= now,
    //   timeRemaining: timeRemaining > 0 ? `${Math.ceil(timeRemaining / 1000)} seconds` : 'EXPIRED'
    // });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Error fetching premium article:', error);

    if (error.message && error.message.includes('authentication failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required to access articles'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch article: ' + (error.message || 'Unknown error')
      },
      { status: 500 }
    );
  }
}

// POST - Mark section as read for premium article
export async function POST(request, { params }) {
  try {
    const { id, articleId } = await params;

    // Auth Check
    const authResult = authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    const userId = authResult.id;

    const body = await request.json();
    const { sectionId, timeSpent = 0, unread = false } = body;

    if (!sectionId) {
      return NextResponse.json({ success: false, error: 'Section ID required' }, { status: 400 });
    }

    await dbConnect();

    // ✅ FIRST: Check subscription with real-time expiration
    let subscription = await Subscription.findOne({
      user: userId,
      product: id,
      paymentStatus: 'completed',
      isLatest: true
    });

    let isTrialAccess = false;

    // Check for Trial Access if Subscription missing or expired
    if (!subscription || subscription.status === 'expired') {
      const user = await User.findById(userId);
      const productToCheck = await Product.findById(id);
      const articleToCheck = productToCheck?.articles.id(articleId);

      if (user?.trial?.isUsed && user.trial.endDate && new Date(user.trial.endDate) > new Date()) {
        if (articleToCheck?.isFreeTrial) {
          isTrialAccess = true;
          subscription = { _id: 'TRIAL', status: 'active', endDate: user.trial.endDate }; // Mock
        }
      }
    }

    if (!subscription && !isTrialAccess) {
      return NextResponse.json({ success: false, error: 'Subscription required' }, { status: 403 });
    }

    // ✅ REAL-TIME expiration check
    const now = new Date();
    const endDate = new Date(subscription.endDate);

    if (!isTrialAccess) {
      if (endDate <= now) {
        // Update status if not already expired
        if (subscription.status !== 'expired') {
          await Subscription.findByIdAndUpdate(subscription._id, {
            status: 'expired',
            lastStatusCheck: now
          });
        }
        return NextResponse.json({
          success: false,
          error: 'Your subscription has expired. Progress cannot be saved.',
          expired: true
        }, { status: 403 });
      }
    }

    // Verify product exists
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const article = product.articles.id(articleId);
    if (!article || !article.isActive) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    // Verify section exists
    const sectionExists = article.sections.some(s => s && s._id && s._id.toString() === sectionId);
    if (!sectionExists) {
      return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
    }

    // Find/Create Progress
    let readingProgress;
    try {
      readingProgress = await ProductReadingProgress.getUserProgress(userId, id, articleId);
      if (!readingProgress) {
        readingProgress = new ProductReadingProgress({
          userId,
          productId: id,
          articleId,
          readSections: []
        });
      }

      // Mark/Unmark specific section
      if (unread) {
        if (readingProgress.unmarkSectionAsRead) {
          readingProgress.unmarkSectionAsRead(sectionId);
        } else {
          // Fallback
          readingProgress.readSections = readingProgress.readSections.filter(
            section => section.sectionId.toString() !== sectionId.toString()
          );
        }
      } else {
        if (readingProgress.markSectionAsRead) {
          readingProgress.markSectionAsRead(sectionId, timeSpent);
        } else {
          // Fallback
          const existingSectionIndex = readingProgress.readSections.findIndex(
            section => section.sectionId.toString() === sectionId.toString()
          );

          if (existingSectionIndex === -1) {
            readingProgress.readSections.push({
              sectionId,
              timeSpent,
              readAt: new Date()
            });
          } else {
            readingProgress.readSections[existingSectionIndex].timeSpent += timeSpent;
            readingProgress.readSections[existingSectionIndex].readAt = new Date();
          }

          readingProgress.totalReadingTime = (readingProgress.totalReadingTime || 0) + timeSpent;
          readingProgress.lastReadAt = new Date();
        }
      }

      // Calculate progress
      let progressData;
      if (readingProgress.calculateProgress) {
        progressData = readingProgress.calculateProgress(article);
      } else {
        // Fallback progress calculation
        const totalSections = article.sections ? article.sections.length : 0;
        const readSectionsCount = readingProgress.readSections.length;

        const readPercentage = totalSections > 0 ? Math.min(100, Math.round((readSectionsCount / totalSections) * 100)) : 0;
        const completed = (readSectionsCount === totalSections) && (totalSections > 0);

        progressData = {
          readPercentage,
          completed,
          readSectionsCount,
          totalSections,
          progressText: `${readSectionsCount}/${totalSections}`
        };

        // Update completion status
        if (completed && !readingProgress.completed) {
          readingProgress.completed = true;
          readingProgress.completedAt = new Date();
        }
      }

      // Save the progress
      await readingProgress.save();

      return NextResponse.json({
        success: true,
        readingProgress: {
          readSections: readingProgress.readSections || [],
          completed: progressData.completed,
          readPercentage: progressData.readPercentage,
          totalReadingTime: readingProgress.totalReadingTime || 0,
          lastReadAt: readingProgress.lastReadAt,
          readSectionsCount: progressData.readSectionsCount,
          totalSections: progressData.totalSections,
          progressText: progressData.progressText
        },
        message: progressData.completed ? 'Article completed!' : 'Progress saved'
      });

    } catch (progressError) {
      console.error('Error updating reading progress:', progressError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update reading progress'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error updating premium article progress:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update progress: ' + (error.message || 'Unknown error')
    }, { status: 500 });
  }
}