import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { termSchema } from '@/lib/validation';
import { Term } from '@/models';
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
    
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const terms = await db.collection<Term>('terms')
      .find(query)
      .sort({ startDate: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: terms.map(t => ({ ...t, _id: t._id!.toString() })),
    });
  } catch (error) {
    console.error('Get terms error:', error);
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
    const validation = termSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();

    if (validation.data.status === 'current') {
      await db.collection<Term>('terms').updateMany(
        { status: 'current' },
        { $set: { status: 'completed', updatedAt: new Date() } }
      );
    }

    const newTerm: Term = {
      ...validation.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<Term>('terms').insertOne(newTerm);

    return NextResponse.json({
      success: true,
      data: { id: result.insertedId.toString(), ...newTerm },
    });
  } catch (error) {
    console.error('Create term error:', error);
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

    if (updateData.status === 'current') {
      await db.collection<Term>('terms').updateMany(
        { status: 'current', _id: { $ne: new ObjectId(id) } },
        { $set: { status: 'completed', updatedAt: new Date() } }
      );
    }

    const result = await db.collection<Term>('terms').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: 'Term not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update term error:', error);
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

    const result = await db.collection<Term>('terms').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Term not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete term error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}