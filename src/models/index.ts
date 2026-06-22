import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'teacher' | 'parent' | 'student';
  createdAt: Date;
  updatedAt: Date;
}

export interface Student {
  _id?: ObjectId;
  name: string;
  rollNumber: string;
  class: string;
  section: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  parentName?: string;
  parentPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Announcement {
  _id?: ObjectId;
  title: string;
  content: string;
  target: 'all' | 'students' | 'teachers' | 'parents' | 'class';
  targetClass?: string;
  priority: number;
  date: Date;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attendance {
  _id?: ObjectId;
  studentId: string;
  class: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Staff {
  _id?: ObjectId;
  name: string;
  email: string;
  phone?: string;
  role: 'teacher' | 'admin' | 'staff';
  department?: string;
  joinDate?: string;
  salary?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Term {
  _id?: ObjectId;
  name: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'current' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}