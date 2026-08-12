import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Course from '@/models/Course';
import '@/models/Subject'; // register Subject schema for populate()
import connectToDatabase from '@/lib/mongodb';
import { asyncHandler } from '@/utils/asyncHandler';

export const GET = asyncHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  
  const filter: any = {};
  
  if (query) {
    filter.title = { $regex: query, $options: 'i' };
  }
  
  // Show all public courses and courses created by user
  filter.$or = [
    { isPublic: true },
    { createdBy: session.user.id }
  ];

  const courses = await Course.find(filter).populate('subjects').sort({ createdAt: -1 });

  return NextResponse.json({ courses });
});

export const POST = asyncHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { title, description, isPublic, thumbnail } = await req.json();

  if (!title || !description) {
    return NextResponse.json({ message: 'Title and description are required' }, { status: 400 });
  }

  await connectToDatabase();

  const course = new Course({
    title,
    description,
    isPublic: isPublic || false,
    thumbnail: thumbnail || '',
    createdBy: session.user.id,
  });

  await course.save();

  return NextResponse.json({ course, message: 'Course created successfully' }, { status: 201 });
});
