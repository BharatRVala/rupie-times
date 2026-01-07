import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Product from "@/app/lib/models/product";
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import { GridFSBucket } from 'mongodb';
import mongoose from 'mongoose';

export async function GET(request) {
  try {
    // ✅ Use admin authentication middleware
    const result = authenticateAdmin(request);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      );
    }

    const admin = result;

    await connectDB();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const globalDurations = searchParams.get('globalDurations');

    if (globalDurations === 'true') {
      const durations = await Product.aggregate([
        { $unwind: "$articles" },
        {
          $match: {
            "articles.issueDate": { $exists: true, $ne: null },
            "articles.issueEndDate": { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: {
              issueDate: "$articles.issueDate",
              issueEndDate: "$articles.issueEndDate"
            }
          }
        },
        {
          $project: {
            _id: 0,
            issueDate: "$_id.issueDate",
            issueEndDate: "$_id.issueEndDate"
          }
        },
        { $sort: { issueDate: -1 } }
      ]);

      return NextResponse.json({ success: true, durations });
    }

    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 12;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const skip = (page - 1) * limit;

    // Build query
    let query = { isDeleted: { $ne: true } };
    if (category && category !== "All Categories") {
      query.category = { $regex: category, $options: 'i' };
    }
    if (search) {
      query.$or = [
        { heading: { $regex: search, $options: 'i' } },
        { publicationType: { $regex: search, $options: 'i' } },
        { fullDescription: { $regex: search, $options: 'i' } },
        ...(search.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: search }] : [])
      ];
    }

    // --- Aggregation for Global Stats ---
    const [statsResult] = await Product.aggregate([
      {
        $facet: {
          totalProducts: [{ $match: { isDeleted: { $ne: true } } }, { $count: "count" }],
          activeProducts: [{ $match: { isActive: true, isDeleted: { $ne: true } } }, { $count: "count" }],
          totalArticles: [
            { $project: { articleCount: { $size: { $ifNull: ["$articles", []] } } } },
            { $group: { _id: null, total: { $sum: "$articleCount" } } }
          ],
          totalVariants: [
            { $project: { variantCount: { $size: { $ifNull: ["$variants", []] } } } },
            { $group: { _id: null, total: { $sum: "$variantCount" } } }
          ],
          categories: [{ $group: { _id: "$category" } }, { $sort: { _id: 1 } }]
        }
      }
    ]);

    const globalStats = {
      totalProducts: statsResult.totalProducts[0]?.count || 0,
      activeProducts: statsResult.activeProducts[0]?.count || 0,
      totalArticles: statsResult.totalArticles[0]?.total || 0,
      totalVariants: statsResult.totalVariants[0]?.total || 0,
    };

    const allCategories = ["All Categories", ...statsResult.categories.filter(c => c._id).map(c => c._id)];

    // Fetch Paginated Products
    const products = await Product.find(query)
      .select('heading publicationType frequency category variants isActive filename createdAt articles.isActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(query);
    const pages = Math.ceil(total / limit);

    // Process products to match frontend structure (calculate price, image, etc.)
    const processedProducts = products.map(product => {
      // 1. Calculate Price Range
      let priceDisplay = '₹0.00';
      let basePrice = 0;

      if (product.variants && product.variants.length > 0) {
        const prices = product.variants
          .filter(variant => variant.price !== undefined && variant.price !== null && !isNaN(variant.price))
          .map(variant => variant.price);

        if (prices.length > 0) {
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          basePrice = minPrice;

          if (minPrice === maxPrice) {
            priceDisplay = `₹${minPrice.toFixed(2)}`;
          } else {
            priceDisplay = `₹${minPrice.toFixed(2)} - ₹${maxPrice.toFixed(2)}`;
          }
        }
      } else {
        basePrice = product.price || 0;
        priceDisplay = `₹${basePrice.toFixed(2)}`;
      }

      // 2. Calculate Duration Range
      let durationDisplay = 'Variable';

      if (product.variants && product.variants.length > 0) {
        // Helper to convert to minutes for sorting
        const getMinutes = (v) => {
          const val = v.durationValue || 0;
          const unit = v.durationUnit || 'months';
          switch (unit) {
            case 'minutes': return val;
            case 'hours': return val * 60;
            case 'days': return val * 60 * 24;
            case 'weeks': return val * 60 * 24 * 7;
            case 'months': return val * 60 * 24 * 30;
            case 'years': return val * 60 * 24 * 365;
            default: return val;
          }
        };

        // Sort variants by duration
        const sortedVariants = [...product.variants].sort((a, b) => getMinutes(a) - getMinutes(b));

        if (sortedVariants.length > 0) {
          const minVariant = sortedVariants[0];
          const maxVariant = sortedVariants[sortedVariants.length - 1];

          const formatDuration = (v) => `${v.durationValue} ${v.durationUnit}`; // e.g. "1 month"

          if (sortedVariants.length === 1 || getMinutes(minVariant) === getMinutes(maxVariant)) {
            durationDisplay = formatDuration(minVariant);
          } else {
            durationDisplay = `${formatDuration(minVariant)} - ${formatDuration(maxVariant)}`;
          }
        }
      }

      // 3. Calculate Article Count
      const articleCount = product.articles ? product.articles.length : 0;
      const activeArticleCount = product.articles ? product.articles.filter(a => a.isActive).length : 0;

      // Map to the structure expected by the Admin Dashboard Table
      return {
        id: product._id.toString(),
        _id: product._id,
        name: product.heading,
        heading: product.heading,
        description: product.publicationType || product.shortDescription,
        category: product.category,
        price: priceDisplay,     // formatted range or single price
        basePrice: basePrice,    // number for sorting/logic
        image: `/api/user/products/image/${product.filename}`,
        img: product.filename,
        filename: product.filename,
        duration: durationDisplay, // formatted range or single duration
        articleCount: articleCount, // Total articles
        activeArticleCount: activeArticleCount, // Extra info if needed
        status: product.isActive ? 'Active' : 'Deactive',
        isActive: product.isActive,
        createdAt: product.createdAt,
        variants: product.variants || []
      };
    });

    return NextResponse.json({
      success: true,
      products: processedProducts,
      stats: globalStats,
      categories: allCategories,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      },
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });

  } catch (error) {
    console.error('Error fetching admin products:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch products: ' + error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    console.log('Starting product upload process...');

    // ✅ Use updated admin authentication middleware
    const result = authenticateAdmin(request);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      );
    }
    const admin = result;
    console.log('Admin authenticated:', admin.email);

    await connectDB();
    console.log('MongoDB connected');

    const formData = await request.formData();
    const file = formData.get('coverImage'); // Frontend sends 'coverImage', previously 'image'

    // Check key mapping from frontend (AddProductContent.jsx uses 'coverImage')
    // Fallback if 'image' was used in other contexts, but prioritizing 'coverImage'
    const imageFile = file || formData.get('image');

    const heading = formData.get('title') || formData.get('heading') || '';
    const publicationType = formData.get('subtitle') || formData.get('publicationType') || formData.get('shortDescription') || '';
    const frequency = formData.get('frequency') || '';
    const fullDescription = formData.get('description') || formData.get('fullDescription') || '';
    const category = formData.get('category') || '';
    // Tags not explicitly in frontend form yet, but good to keep
    const tags = formData.get('tags') || '';

    // Get dynamic variants from form data
    const variantsData = [];
    let variantIndex = 0;

    // Loop through all variants in form data
    while (true) {
      // Check if any field exists for this index to determine existence
      const hasDuration = formData.has(`variants[${variantIndex}][duration]`);
      const hasPrice = formData.has(`variants[${variantIndex}][price]`);

      if (!hasDuration && !hasPrice) {
        break;
      }

      const duration = formData.get(`variants[${variantIndex}][duration]`);
      const durationValue = formData.get(`variants[${variantIndex}][durationValue]`);
      const durationUnit = formData.get(`variants[${variantIndex}][durationUnit]`);
      const price = formData.get(`variants[${variantIndex}][price]`);
      const description = formData.get(`variants[${variantIndex}][description]`) || '';

      if (duration && durationValue && durationUnit && price) {
        variantsData.push({
          duration: duration.trim(),
          durationValue: parseInt(durationValue),
          durationUnit: durationUnit,
          price: parseFloat(price),
          description: description.trim()
        });
      }

      variantIndex++;
    }

    if (!imageFile) {
      return NextResponse.json({
        success: false,
        error: 'No product image uploaded'
      }, { status: 400 });
    }

    // Validate required fields
    if (!heading || !publicationType || !frequency || !fullDescription || !category) {
      return NextResponse.json({
        success: false,
        error: 'Title, Publication Type, Frequency, Full Description, and Category are required'
      }, { status: 400 });
    }

    // Validate at least one variant
    if (variantsData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one pricing variant is required'
      }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create GridFS bucket
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, {
      bucketName: 'products'
    });

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${imageFile.name.replace(/\s+/g, '-')}`;

    // Upload to GridFS
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: imageFile.type,
      metadata: {
        heading,
        publicationType,
        frequency,
        fullDescription,
        category,
        originalName: imageFile.name,
        createdBy: admin.id,
        createdByEmail: admin.email
      }
    });

    return new Promise((resolve, reject) => {
      uploadStream.end(buffer);

      uploadStream.on('finish', async () => {
        try {
          // Save metadata to Product collection
          const product = new Product({
            filename: filename,
            contentType: imageFile.type,
            size: buffer.length,
            heading, // Mapped from title
            publicationType, // Mapped from subtitle/shortDescription or new field
            frequency,
            fullDescription, // Mapped from description
            category,
            tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            variants: variantsData,
            isActive: true, // Default active
            metadata: {
              gridfsId: uploadStream.id.toString(),
              originalName: imageFile.name,
              createdBy: admin.id,
              createdByEmail: admin.email,
              adminRole: admin.role
            }
          });

          await product.save();
          console.log('Product saved to database by admin:', admin.email);

          resolve(NextResponse.json({
            success: true,
            message: 'Product uploaded successfully',
            product: {
              id: product._id,
              filename: product.filename,
              heading: product.heading,
              category: product.category
            }
          }));
        } catch (error) {
          console.error('Error saving product metadata:', error);
          reject(NextResponse.json({
            success: false,
            error: 'Failed to save product metadata: ' + error.message
          }, { status: 500 }));
        }
      });

      uploadStream.on('error', (error) => {
        console.error('GridFS upload error:', error);
        reject(NextResponse.json({
          success: false,
          error: 'GridFS upload failed: ' + error.message
        }, { status: 500 }));
      });
    });

  } catch (error) {
    console.error('Upload error details:', error);
    return NextResponse.json({
      success: false,
      error: 'Upload failed: ' + error.message
    }, { status: 500 });
  }
}

