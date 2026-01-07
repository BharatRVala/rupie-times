import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Ipo from '@/app/lib/models/Ipo';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

export async function PUT(req, { params }) {
  try {
    await connectDB();
    
    // Authenticate admin
    const auth = authenticateAdmin(req);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }
    
    const { id } = await params;
    const body = await req.json();
    
    // Find and update IPO
    const ipo = await Ipo.findById(id);
    
    if (!ipo) {
      return NextResponse.json(
        { success: false, message: 'IPO not found' },
        { status: 404 }
      );
    }
    
    // Validate dates if provided
    if (body.openingDate || body.closingDate) {
      const openingDate = body.openingDate ? new Date(body.openingDate) : ipo.openingDate;
      const closingDate = body.closingDate ? new Date(body.closingDate) : ipo.closingDate;
      
      if (openingDate > closingDate) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Opening date cannot be after closing date.' 
          },
          { status: 400 }
        );
      }
    }
    
    // Update only allowed fields
    const allowedFields = ['company', 'openingDate', 'closingDate', 'issuePrice', 'link'];
    const updates = {};
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        if (field === 'openingDate' || field === 'closingDate') {
          updates[field] = new Date(body[field]);
        } else {
          updates[field] = body[field];
        }
      }
    });
    
    // Apply updates
    Object.assign(ipo, updates);
    ipo.updatedBy = auth.id;
    
    await ipo.save();
    
    return NextResponse.json({
      success: true,
      message: 'IPO updated successfully',
      data: ipo
    });
    
  } catch (error) {
    console.error('Update IPO error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Server error', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    
    // Authenticate admin
    const auth = authenticateAdmin(req);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }
    
    const { id } = await params;
    
    // Find and delete IPO (hard delete)
    const ipo = await Ipo.findById(id);
    
    if (!ipo) {
      return NextResponse.json(
        { success: false, message: 'IPO not found' },
        { status: 404 }
      );
    }
    
    // Hard delete the IPO
    await Ipo.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'IPO deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete IPO error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Server error', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(req, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    
    const ipo = await Ipo.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!ipo) {
      return NextResponse.json(
        { success: false, message: 'IPO not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: ipo
    });
    
  } catch (error) {
    console.error('Get IPO error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Server error', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}