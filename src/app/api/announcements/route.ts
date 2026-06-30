export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { announcementSchema } from '@/lib/validation';
import { Announcement } from '@/models';
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
    
    const target = searchParams.get('target') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');
    const fromDate = searchParams.get('fromDate');

    const query: Record<string, unknown> = {
      target: { $in: [target, 'all'] },
      date: { $lte: new Date() },
    };

    if (fromDate) {
      query.date = { ...query.date as Record<string, unknown>, $gte: new Date(fromDate) };
    }

    const announcements = await db.collection<Announcement>('announcements')
      .find(query)
      .sort({ date: -1, priority: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      data: announcements.map(a => ({ ...a, _id: a._id!.toString() })),
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth || !['admin', 'teacher'].includes(auth.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = announcementSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();

    const newAnnouncement: Announcement = {
      ...validation.data,
      date: validation.data.date ? new Date(validation.data.date) : new Date(),
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<Announcement>('announcements').insertOne(newAnnouncement);

    return NextResponse.json({
      success: true,
      data: { id: result.insertedId.toString(), ...newAnnouncement },
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth || !['admin', 'teacher'].includes(auth.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const db = await getDb();

    const result = await db.collection<Announcement>('announcements').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: 'Announcement not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update announcement error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const db = await getDb();

    await db.collection<Announcement>('announcements').updateOne(
      { _id: new ObjectId(id) },
      { $inc: { views: 1 } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Increment views error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}