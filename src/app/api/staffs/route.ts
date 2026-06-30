import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { staffSchema } from '@/lib/validation';
import { Staff } from '@/models';
import { ObjectId } from 'mongodb';
import { verifyToken, extractTokenFromRequest } from '@/lib/auth';

async function authenticate(request: NextRequest) {
  const token = extractTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const searchParams = request.nextUrl.searchParams;
    
    const role = searchParams.get('role');
    const department = searchParams.get('department');

    const query: Record<string, unknown> = {};
    if (role) query.role = role;
    if (department) query.department = department;

    const staff = await db.collection<Staff>('staffs')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: staff.map(s => ({ ...s, _id: s._id!.toString() })),
    });
  } catch (error) {
    console.error('Get staffs error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = staffSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();

    const existing = await db.collection<Staff>('staffs').findOne({ email: validation.data.email });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Staff with this email already exists' }, { status: 400 });
    }

    const newStaff: Staff = {
      ...validation.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<Staff>('staffs').insertOne(newStaff);

    return NextResponse.json({
      success: true,
      data: { id: result.insertedId.toString(), ...newStaff },
    });
  } catch (error) {
    console.error('Create staff error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const db = await getDb();

    const result = await db.collection<Staff>('staffs').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update staff error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const db = await getDb();

    const result = await db.collection<Staff>('staffs').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete staff error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}