// src/app/api/user/payments/[id]/resend/route.js
import { NextResponse } from 'next/server';
import { authenticateUser } from '@/app/lib/middleware/auth';
// import { Resend } from 'resend';
import { sendEmail, generateEmailTemplate, SOCIAL_ATTACHMENTS } from '@/app/lib/utils/resend';

import connectDB from '@/app/lib/utils/dbConnect';
import Payment from '@/app/lib/models/Payment';
import Product from '@/app/lib/models/product';
import { renderToBuffer } from '@react-pdf/renderer';
import InvoicePDF from '@/app/components/invoice/InvoicePDF';
import path from 'path';
import fs from 'fs';

// const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request, { params }) {
    try {
        await connectDB();
        const { id } = await params;
        const authResult = authenticateUser(request);

        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: 401 });
        }

        // Fetch Payment
        const payment = await Payment.findOne({
            razorpayOrderId: id,
            user: authResult.id
        })
            .populate({
                path: 'subscriptions',
                populate: {
                    path: 'product',
                    select: 'heading shortDescription category',
                    model: Product
                }
            })
            .lean();

        if (!payment) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const { metadata } = payment;

        // Format data for PDF
        const pdfData = {
            orderId: payment.razorpayOrderId,
            orderDate: payment.createdAt,
            paymentStatus: payment.status,
            amount: metadata?.subtotal || payment.amount,
            discountAmount: metadata?.discount_amount || 0,
            userEmail: authResult.email,
            subscriptions: payment.subscriptions || [], // Pass full subscription objects which include dates
            cartItems: metadata?.cartItems || [] // Fallback
        };

        // Load logo
        let logoBase64 = null;
        try {
            const logoPath = path.join(process.cwd(), 'public', 'logo.png');
            if (fs.existsSync(logoPath)) {
                const logoBuffer = fs.readFileSync(logoPath);
                logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
            }
        } catch (e) { console.warn('Logo load failed', e); }

        // Generate PDF
        let pdfBuffer;
        try {
            const pdfDocument = <InvoicePDF order={pdfData} logoData={logoBase64} />;
            pdfBuffer = await renderToBuffer(pdfDocument);
        } catch (err) {
            console.error('PDF Generation failed', err);
            return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
        }

        // Generate Items HTML similar to verify/route.js
        const itemsList = pdfData.subscriptions.length > 0 ? pdfData.subscriptions : pdfData.cartItems;

        const itemsHtml = itemsList.map(item => {
            // Adjust property access based on whether it's a subscription object or cart item
            const heading = item.product?.heading || item.heading || 'Subscription';
            const duration = item.variant?.duration || item.duration || '';
            const price = item.amountPaid || item.price || item.variant?.price || 0;

            return `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
            <span style="flex: 1; font-size: 13px; color: #666; text-transform: uppercase;">${heading} <span style="font-size: 11px; color: #888; text-transform: none;">(${duration})</span></span>
            <span style="font-weight: bold; color: #000; font-size: 14px;">₹${price}</span>
        </div>
        `}).join('');

        const invoiceContent = `
       <h1 style="font-size: 24px; color: #1f4235; margin-bottom: 25px;">Order #${payment.razorpayOrderId}</h1>
       
       <p style="margin-bottom: 20px;">Hello <strong>${authResult.name || 'Valued Customer'}</strong>,</p>
       <p style="margin-bottom: 20px;">Thank you for choosing Rupie Times! Your order has been successfully processed.</p>
       
       <div style="background: #fefaf0; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #c29854; border: 1px solid #e5e7eb;">
           <h3 style="margin-top: 0; color: #1f4235; font-size: 16px; margin-bottom: 8px;">📎 Invoice Attached</h3>
           <p style="margin: 0; font-size: 14px; color: #555;">Your official tax invoice <strong>Invoice_${payment.razorpayOrderId}.pdf</strong> is attached to this email.</p>
       </div>
       
       <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #eee;">
           <h3 style="margin-top: 0; color: #1f4235; text-transform: uppercase; font-size: 14px; border-bottom: 2px solid #c29854; padding-bottom: 10px; display: inline-block;">Order Summary</h3>
           
           <div style="margin-top: 15px;">
               ${itemsHtml}
           </div>
       </div>
       
       <div style="background: #1f4235; color: white; padding: 15px; border-radius: 4px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
           <span style="font-weight: bold; font-size: 16px; text-transform: uppercase;">Total Paid</span>
           <span style="font-weight: bold; font-size: 20px; color: #c29854;">₹${(payment.metadata?.totalInRupees || payment.amount).toFixed(2)}</span>
       </div>
       
       <div style="text-align: center; margin-top: 30px;">
        <a href="https://www.rupietimes.com/dashboard/subscriptions" style="display: inline-block; background: #1f4235; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Subscription</a>
       </div>
    `;



        // Send Email
        const { data, error } = await sendEmail({
            to: [authResult.email],
            subject: `Invoice for Order #${payment.razorpayOrderId}`,
            html: generateEmailTemplate(invoiceContent),
            attachments: [{
                filename: `Invoice_${payment.razorpayOrderId}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            },
            ...SOCIAL_ATTACHMENTS
            ]
        });

        if (error) {
            console.error('Email send failed:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Invoice sent successfully' });

    } catch (err) {
        console.error('Resend API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
