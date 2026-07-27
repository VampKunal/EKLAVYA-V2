import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Course from '@/models/Course';
import connectToDatabase from '@/lib/mongodb';
import { asyncHandler } from '@/utils/asyncHandler';

export const GET = asyncHandler(async (req: Request, { params }: { params: { courseId: string } }) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();

  const course = await Course.findById(params.courseId).populate('subjects');

  if (!course) {
    return NextResponse.json({ message: 'Course not found' }, { status: 404 });
  }

  return NextResponse.json({ course });
});

export const PUT = asyncHandler(async (req: Request, { params }: { params: { courseId: string } }) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { title, description, isPublic, thumbnail } = await req.json();

  await connectToDatabase();

  const course = await Course.findById(params.courseId);

  if (!course) {
    return NextResponse.json({ message: 'Course not found' }, { status: 404 });
  }

  // Only creator or admin can edit
  if (course.createdBy.toString() !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  if (title !== undefined) course.title = title;
  if (description !== undefined) course.description = description;
  if (isPublic !== undefined) course.isPublic = isPublic;
  if (thumbnail !== undefined) course.thumbnail = thumbnail;

  await course.save();

  return NextResponse.json({ course, message: 'Course updated successfully' });
});

export const DELETE = asyncHandler(async (req: Request, { params }: { params: { courseId: string } }) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();

  const course = await Course.findById(params.courseId);

  if (!course) {
    return NextResponse.json({ message: 'Course not found' }, { status: 404 });
  }

  // Only creator or admin can delete
  if (course.createdBy.toString() !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  await Course.findByIdAndDelete(params.courseId);

  return NextResponse.json({ message: 'Course deleted successfully' });
});
