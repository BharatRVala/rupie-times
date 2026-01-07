import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Product from "@/app/lib/models/product";
import { GridFSBucket, ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

export async function PUT(request) {
  try {
    // ✅ Use updated admin authentication middleware
    const result = authenticateAdmin(request);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      );
    }

    const admin = result;

    await connectDB();

    const contentType = request.headers.get('content-type') || '';

    let productId, heading, publicationType, frequency, fullDescription, category, tags, isActive;
    let variantsData = [];
    let file;
    let promoCodesData = [];

    // Handle JSON (for simple status toggle)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      productId = body.productId;
      isActive = body.isActive;
      // Other fields can be pulled if needed, but primarily for status toggle here
    } else {
      // Handle FormData (existing logic)
      const formData = await request.formData();
      productId = formData.get('productId');
      heading = formData.get('heading');
      publicationType = formData.get('publicationType') || formData.get('shortDescription');
      frequency = formData.get('frequency');
      fullDescription = formData.get('fullDescription');
      category = formData.get('category');
      tags = formData.get('tags');
      file = formData.get('image');
      isActive = formData.get('isActive');

      // Get dynamic variants from form data
      let variantIndex = 0;
      while (true) {
        const duration = formData.get(`variants[${variantIndex}][duration]`);
        const durationValue = formData.get(`variants[${variantIndex}][durationValue]`);
        const durationUnit = formData.get(`variants[${variantIndex}][durationUnit]`);
        const price = formData.get(`variants[${variantIndex}][price]`);
        const description = formData.get(`variants[${variantIndex}][description]`) || '';

        if (!duration && !durationValue && !durationUnit && !price) break;

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

      // Handle Promo Codes logic here
      // Get promo codes from form data
      let promoIndex = 0;
      // Check if any promo code data exists first
      const hasPromoData = formData.has('promoCodes[0][code]');

      if (hasPromoData || formData.has('promoCodesSent')) {
        while (true) {
          const code = formData.get(`promoCodes[${promoIndex}][code]`);
          const discountType = formData.get(`promoCodes[${promoIndex}][discountType]`);
          const discountValue = formData.get(`promoCodes[${promoIndex}][discountValue]`);

          if (!code) break;

          if (code && discountType && discountValue) {
            promoCodesData.push({
              code: code.trim().toUpperCase(),
              discountType,
              discountValue: parseFloat(discountValue),
              validFrom: formData.get(`promoCodes[${promoIndex}][validFrom]`) || Date.now(),
              validUntil: formData.get(`promoCodes[${promoIndex}][validUntil]`) || null,
              usageLimit: formData.get(`promoCodes[${promoIndex}][usageLimit]`) ? parseInt(formData.get(`promoCodes[${promoIndex}][usageLimit]`)) : null,
              isActive: formData.get(`promoCodes[${promoIndex}][isActive]`) !== 'false'
            });
          }
          promoIndex++;
        }
      }

      // Also check for promo codes sent via form data (redundant but safe)
      if (promoCodesData.length > 0 || (contentType.includes('multipart/form-data') && formData.has('promoCodesSent'))) {
        // already assigned above if populated
      }
    }

    if (!productId) {
      return NextResponse.json({
        success: false,
        error: 'Product ID is required'
      }, { status: 400 });
    }

    // Find existing product
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return NextResponse.json({
        success: false,
        error: 'Product not found'
      }, { status: 404 });
    }

    // Prepare update data - only include fields that are provided
    let updateData = {
      'metadata.updatedBy': admin.id,
      'metadata.updatedByEmail': admin.email,
      'metadata.updatedAt': new Date()
    };

    // Only update fields that are provided (not null/undefined)
    if (heading !== null && heading !== undefined) updateData.heading = heading;
    if (publicationType !== null && publicationType !== undefined) updateData.publicationType = publicationType;
    if (frequency !== null && frequency !== undefined) updateData.frequency = frequency;
    if (fullDescription !== null && fullDescription !== undefined) updateData.fullDescription = fullDescription;
    if (category !== null && category !== undefined) updateData.category = category;

    // Handle tags
    if (tags !== null && tags !== undefined) {
      updateData.tags = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : existingProduct.tags;
    }

    // Handle isActive status
    if (isActive !== null && isActive !== undefined) {
      updateData.isActive = String(isActive) === 'true';
    }

    // Handle variants update only if variants are provided
    if (variantsData.length > 0) {
      // Validate variant data
      const validUnits = ['minutes', 'hours', 'days', 'weeks', 'months', 'years'];

      for (const variant of variantsData) {
        if (variant.durationValue < 1) {
          return NextResponse.json({
            success: false,
            error: 'Duration value must be at least 1'
          }, { status: 400 });
        }

        if (!validUnits.includes(variant.durationUnit)) {
          return NextResponse.json({
            success: false,
            error: `Invalid duration unit: ${variant.durationUnit}. Must be one of: ${validUnits.join(', ')}`
          }, { status: 400 });
        }

        if (variant.price < 0) {
          return NextResponse.json({
            success: false,
            error: 'Price cannot be negative'
          }, { status: 400 });
        }
      }
    }

    // Assign variants if populated
    if (variantsData.length > 0) {
      updateData.variants = variantsData;
    }

    // Assign promoCodes if populated
    if (promoCodesData.length > 0) {
      updateData.promoCodes = promoCodesData;
    }

    // If new file is uploaded
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const db = mongoose.connection.db;
      const bucket = new GridFSBucket(db, { bucketName: 'products' });

      // Delete old file from GridFS
      if (existingProduct.metadata && existingProduct.metadata.gridfsId) {
        try {
          await bucket.delete(new ObjectId(existingProduct.metadata.gridfsId));
          // console.log('Old GridFS file deleted:', existingProduct.metadata.gridfsId);
        } catch (error) {
          // console.log('Old file not found in GridFS, continuing...');
        }
      }

      // Upload new file
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name}`;

      const uploadStream = bucket.openUploadStream(filename, {
        contentType: file.type,
        metadata: {
          heading: heading || existingProduct.heading,
          publicationType: publicationType || existingProduct.publicationType || existingProduct.shortDescription,
          frequency: frequency || existingProduct.frequency,
          fullDescription: fullDescription || existingProduct.fullDescription,
          category: category || existingProduct.category,
          originalName: file.name,
          updatedBy: admin.id,
          updatedByEmail: admin.email
        }
      });

      await new Promise((resolve, reject) => {
        uploadStream.end(buffer);
        uploadStream.on('finish', resolve);
        uploadStream.on('error', reject);
      });

      updateData.filename = filename;
      updateData.contentType = file.type;
      updateData.size = buffer.length;
      updateData['metadata.gridfsId'] = uploadStream.id.toString();
      updateData['metadata.originalName'] = file.name;
    }

    // Update product in database - use findByIdAndUpdate with runValidators: false for partial updates
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      {
        new: true,
        runValidators: false // Disable validators for partial updates
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      product: {
        id: updatedProduct._id,
        filename: updatedProduct.filename,
        heading: updatedProduct.heading,
        publicationType: updatedProduct.publicationType,
        frequency: updatedProduct.frequency,
        fullDescription: updatedProduct.fullDescription,
        category: updatedProduct.category,
        tags: updatedProduct.tags,
        variants: updatedProduct.variants,
        isActive: updatedProduct.isActive,
        uploadDate: updatedProduct.uploadDate,
        updatedAt: updatedProduct.updatedAt,
        metadata: updatedProduct.metadata
      },
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    });

  } catch (error) {
    console.error('Update product error:', error);

    // ✅ Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin authentication required to update products'
        },
        { status: 401 }
      );
    }

    // Handle validation errors more gracefully
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed. Please check all required fields.',
          details: Object.values(error.errors).map(err => err.message)
        },
        { status: 400 }
      );
    }

    // ✅ Handle invalid product ID format
    if (error.name === 'CastError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid product ID format'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update product: ' + error.message
    }, { status: 500 });
  }
}