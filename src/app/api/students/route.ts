import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { studentSchema } from '@/lib/validation';
import { Student } from '@/models';
import { ObjectId } from 'mongodb';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

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
    const section = searchParams.get('section');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: Record<string, unknown> = {};
    if (className) query.class = className;
    if (section) query.section = section;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const students = await db.collection<Student>('students')
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();

    const total = await db.collection<Student>('students').countDocuments(query);

    return NextResponse.json({
      success: true,
      data: students.map(s => ({ ...s, _id: s._id!.toString() })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get students error:', error);
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
    const validation = studentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();

    const existing = await db.collection<Student>('students').findOne({ rollNumber: validation.data.rollNumber });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Student with this roll number already exists' }, { status: 400 });
    }

    const newStudent: Student = {
      ...validation.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<Student>('students').insertOne(newStudent);

    return NextResponse.json({
      success: true,
      data: { id: result.insertedId.toString(), ...newStudent },
    });
  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}