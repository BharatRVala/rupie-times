import { NextResponse } from 'next/server';
import { authenticateUser } from '@/app/lib/middleware/auth';
// import { Resend } from 'resend';
import { sendEmail } from '@/app/lib/utils/resend';
import connectDB from '@/app/lib/utils/dbConnect';
import Subscription from '@/app/lib/models/Subscription';
import Product from '@/app/lib/models/product';
import { renderToBuffer } from '@react-pdf/renderer';
import InvoicePDF from '@/app/components/invoice/InvoicePDF';
import path from 'path';
import fs from 'fs';

// Initialize Resend with your API key
// const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const authResult = authenticateUser(request);

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const orderId = id;
    const order = await Subscription.findOne({
      _id: orderId,
      user: authResult.id
    })
      .populate({
        path: 'product',
        select: 'heading shortDescription category',
        model: Product
      })
      .lean();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Format order data for email HTML
    const orderData = {
      orderId: order.transactionId || `ORD_${order._id.toString().slice(-8)}`,
      _id: order._id,
      id: order._id,
      orderId: orderData.orderId,
      product: {
        heading: orderData.productName,
        shortDescription: order.product?.shortDescription || '',
        filename: order.product?.filename || null,
        category: order.product?.category || 'Uncategorized'
      },
      variant: order.variant || {
        duration: 'N/A',
        price: 0,
        durationValue: 0,
        durationUnit: 'months'
      },
      orderDate: order.createdAt,
      paymentStatus: order.paymentStatus,
      paymentId: order.paymentId,
      transactionId: order.transactionId,
      amount: orderData.amount,
      subscriptionStatus: order.status,
      startDate: order.startDate,
      endDate: order.endDate,
      paymentMethod: order.metadata?.paymentMethod || 'razorpay',
      // ✅ Pass User Email for PDF Footer
      userEmail: authResult.email
    };

    // Read Logo File and Convert to Base64 for Server-Side Rendering
    let logoBase64 = null;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      }
    } catch (e) {
      console.warn('⚠️ Could not load logo for PDF generation on server');
    }

    console.log('🚀 SENDING INVOICE EMAIL TO:', authResult.email);

    // Generate PDF buffer
    let pdfBuffer;
    try {
      // Pass logoData prop
      const pdfDocument = <InvoicePDF order={formattedOrderForPDF} logoData={logoBase64} />;
      pdfBuffer = await renderToBuffer(pdfDocument);
      console.log('✅ PDF generated successfully:', pdfBuffer.length, 'bytes');
    } catch (pdfError) {
      console.error('❌ PDF generation failed:', pdfError);
      return NextResponse.json(
        { error: 'Failed to generate invoice PDF' },
        { status: 500 }
      );
    }

    // Send email with PDF attachment
    // Generate Items HTML List (Single order item)
    // Same structure as verify route for consistency
    const itemsHtml = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
          <span style="flex: 1; font-size: 13px; color: #666; text-transform: uppercase;">${orderData.product.heading} <span style="font-size: 11px; color: #888; text-transform: none;">(${orderData.variant.duration})</span></span>
          <span style="font-weight: bold; color: #000; font-size: 14px;">₹${orderData.amount}</span>
      </div>
    `;

    const invoiceContent = `
       <h1 style="font-size: 24px; color: #1f4235; margin-bottom: 25px;">Order #${orderData.orderId}</h1>
       
       <p style="margin-bottom: 20px;">Hello <strong>${authResult.name || 'Valued Customer'}</strong>,</p>
       <p style="margin-bottom: 20px;">Thank you for choosing Rupie Times! Your subscription has been successfully activated.</p>
       
       <div style="background: #fefaf0; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #c29854; border: 1px solid #e5e7eb;">
           <h3 style="margin-top: 0; color: #1f4235; font-size: 16px; margin-bottom: 8px;">📎 Invoice Attached</h3>
           <p style="margin: 0; font-size: 14px; color: #555;">Your official tax invoice <strong>Invoice_${orderData.orderId}.pdf</strong> is attached to this email.</p>
       </div>
       
       <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #eee;">
           <h3 style="margin-top: 0; color: #1f4235; text-transform: uppercase; font-size: 14px; border-bottom: 2px solid #c29854; padding-bottom: 10px; display: inline-block;">Order Summary</h3>
           
           <div style="margin-top: 15px;">
               ${itemsHtml}
               
               <div style="display: flex; justify-content: space-between; margin-top: 10px; border-top: 2px solid #ddd; padding-top: 10px;">
                   <span style="font-size: 13px; color: #666; text-transform: uppercase;">Status</span>
                   <span style="font-weight: bold; color: #059669; font-size: 14px;">${orderData.paymentStatus.toUpperCase()}</span>
               </div>
           </div>
       </div>
       
       <div style="background: #1f4235; color: white; padding: 15px; border-radius: 4px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
           <span style="font-weight: bold; font-size: 16px; text-transform: uppercase;">Total Paid</span>
           <span style="font-weight: bold; font-size: 20px; color: #c29854;">₹${orderData.amount}</span>
       </div>
       
       <div style="text-align: center; margin-top: 30px;">
        <a href="https://www.rupietimes.com/dashboard/subscriptions" style="display: inline-block; background: #1f4235; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Subscription</a>
       </div>
    `;

    // Import template generator
    const { generateEmailTemplate } = require('@/app/lib/utils/resend');

    // Send email with PDF attachment
    const { data, error } = await sendEmail({
      to: [authResult.email],
      subject: `Invoice for Order #${orderData.orderId}`,
      html: generateEmailTemplate(invoiceContent),
      attachments: [
        {
          filename: `Invoice_${orderData.orderId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    if (error) {
      console.error('❌ EMAIL WITH ATTACHMENT FAILED:', error);
      return NextResponse.json(
        { error: `Failed to send email with invoice: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('✅ INVOICE EMAIL SENT SUCCESSFULLY:', data);

    return NextResponse.json({
      success: true,
      message: '✅ Invoice email with PDF attachment sent successfully!',
      emailData: {
        id: data.id,
        to: authResult.email,
        subject: `Invoice for Order #${orderData.orderId}`,
        attachment: `Invoice_${orderData.orderId}.pdf`
      }
    });

  } catch (error) {
    console.error('❌ Error sending invoice email:', error);
    return NextResponse.json(
      { error: 'Failed to send invoice email' },
      { status: 500 }
    );
  }
}