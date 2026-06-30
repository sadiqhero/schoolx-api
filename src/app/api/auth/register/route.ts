export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { hashPassword, generateToken, JWTPayload } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';
import { User } from '@/models';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, name, role } = validation.data;
    const db = await getDb();

    const existingUser = await db.collection<User>('users').findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const newUser: User = {
      email,
      password: hashedPassword,
      name,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<User>('users').insertOne(newUser);

    const payload: JWTPayload = {
      userId: result.insertedId.toString(),
      email,
      role,
    };

    const token = generateToken(payload);

    const response = NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: result.insertedId.toString(),
          email,
          name,
          role,
        },
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}