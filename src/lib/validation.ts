import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'teacher', 'parent', 'student']).default('teacher'),
});

export const studentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  rollNumber: z.string().min(1, 'Roll number is required'),
  class: z.string().min(1, 'Class is required'),
  section: z.string().min(1, 'Section is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
});

export const announcementSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  target: z.enum(['all', 'students', 'teachers', 'parents', 'class']).default('all'),
  targetClass: z.string().optional(),
  priority: z.number().min(0).max(10).default(0),
  date: z.string().optional(),
});

export const attendanceSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  class: z.string().min(1, 'Class is required'),
  date: z.string().min(1, 'Date is required'),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  remarks: z.string().optional(),
});

export const staffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  role: z.enum(['teacher', 'admin', 'staff']),
  department: z.string().optional(),
  joinDate: z.string().optional(),
  salary: z.number().optional(),
});

export const termSchema = z.object({
  name: z.string().min(2, 'Term name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  status: z.enum(['upcoming', 'current', 'completed']).default('upcoming'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type StudentInput = z.infer<typeof studentSchema>;
export type AnnouncementInput = z.infer<typeof announcementSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
export type StaffInput = z.infer<typeof staffSchema>;
export type TermInput = z.infer<typeof termSchema>;