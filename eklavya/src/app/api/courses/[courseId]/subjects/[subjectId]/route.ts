import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Course from '@/models/Course';
import Subject from '@/models/Subject';
import connectToDatabase from '@/lib/mongodb';
import { asyncHandler } from '@/utils/asyncHandler';

/** DELETE /api/courses/[courseId]/subjects/[subjectId] */
export const DELETE = asyncHandler(async (
  req: Request,
  props: { params: Promise<{ courseId: string; subjectId: string }> }
) => {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();

  const course = await Course.findById(params.courseId);
  if (!course) {
    return NextResponse.json({ message: 'Course not found' }, { status: 404 });
  }

  if (course.createdBy.toString() !== session.user.id && (session.user as any).role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  await Subject.findByIdAndDelete(params.subjectId);

  // Remove from course subjects array
  course.subjects = (course.subjects || []).filter(
    (id: any) => id.toString() !== params.subjectId
  );
  await course.save();

  return NextResponse.json({ message: 'Module deleted successfully' });
});
