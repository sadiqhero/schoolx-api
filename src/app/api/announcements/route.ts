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

    // matches the client's actual param name (was previously mismatched with 'target')
    const audience = searchParams.get('audience');
    const limit = parseInt(searchParams.get('limit') || '10');

    const query: Record<string, unknown> = {};

    // 'all' or no param = no audience filter, return everything
    if (audience && audience.toLowerCase() !== 'all') {
      query.audience = { $in: [audience.toLowerCase()] };
    }

    const announcements = await db.collection('announcements')
      .find(query)
      // timestamp is stored as a display string (e.g. "8/17/2026, 1:41:03 PM"), not chronologically
      // sortable — _id embeds a creation-time timestamp, so it's a reliable proxy for "newest first"
      .sort({ _id: -1 })
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

    const newAnnouncement = {
      title: validation.data.title,
      content: validation.data.content,
      audience: (validation.data.audience || ['all']).map((a: string) => a.toLowerCase()),
      timestamp: new Date().toLocaleString(),
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<Announcement>('announcements').insertOne(newAnnouncement);

    return NextResponse.json({
      success: true,
      data: { _id: result.insertedId.toString(), ...newAnnouncement },
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

    // keep audience lowercase and array-shaped if it's part of the update
    if (updateData.audience) {
      updateData.audience = updateData.audience.map((a: string) => a.toLowerCase());
    }

    const db = await getDb();

    const result = await db.collection('announcements').updateOne(
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

    await db.collection('announcements').updateOne(
      { _id: new ObjectId(id) },
      { $inc: { views: 1 } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Increment views error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}