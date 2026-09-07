import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Course from '@/models/Course';
import Subject from '@/models/Subject';
import connectToDatabase from '@/lib/mongodb';
import { asyncHandler } from '@/utils/asyncHandler';

/** POST /api/courses/[courseId]/subjects — add a module to a course */
export const POST = asyncHandler(async (req: Request, props: { params: Promise<{ courseId: string }> }) => {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { name, description } = await req.json();

  if (!name) {
    return NextResponse.json({ message: 'Module name is required' }, { status: 400 });
  }

  await connectToDatabase();

  const course = await Course.findById(params.courseId);
  if (!course) {
    return NextResponse.json({ message: 'Course not found' }, { status: 404 });
  }

  // Only creator or admin can add modules
  if (course.createdBy.toString() !== session.user.id && (session.user as any).role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  // Auto-assign order as next in sequence
  const existingCount = await Subject.countDocuments({ courseId: params.courseId });

  const subject = new Subject({
    name,
    description: description || '',
    courseId: params.courseId,
    order: existingCount,
  });

  await subject.save();

  // Push subject ref into course
  course.subjects = course.subjects || [];
  course.subjects.push(subject._id);
  await course.save();

  return NextResponse.json({ subject, message: 'Module added successfully' }, { status: 201 });
});
