import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { attendanceSchema } from '@/lib/validation';
import { Attendance } from '@/models';
import { ObjectId } from 'mongodb';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { getSocketServer } from '@/lib/socket';

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);
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
    
    const className = searchParams.get('class');
    const date = searchParams.get('date');
    const studentId = searchParams.get('studentId');

    const query: Record<string, unknown> = {};
    if (className) query.class = className;
    if (date) query.date = date;
    if (studentId) query.studentId = studentId;

    const records = await db.collection<Attendance>('attendance')
      .find(query)
      .sort({ date: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: records.map(r => ({ ...r, _id: r._id!.toString() })),
    });
  } catch (error) {
    console.error('Get attendance error:', error);
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
    const validation = attendanceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();

    const existing = await db.collection<Attendance>('attendance').findOne({
      studentId: validation.data.studentId,
      class: validation.data.class,
      date: validation.data.date,
    });

    let result;
    if (existing) {
      result = await db.collection<Attendance>('attendance').updateOne(
        { _id: existing._id },
        { $set: { ...validation.data, updatedAt: new Date() } }
      );
    } else {
      const newAttendance: Attendance = {
        ...validation.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      result = await db.collection<Attendance>('attendance').insertOne(newAttendance);
    }

    const io = getSocketServer();
    if (io) {
      io.emit('attendance:updated', { 
        studentId: validation.data.studentId, 
        class: validation.data.class, 
        date: validation.data.date,
        status: validation.data.status 
      });
    }

    return NextResponse.json({
      success: true,
      data: { id: existing ? existing._id!.toString() : result.insertedId.toString() },
    });
  } catch (error) {
    console.error('Create attendance error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}