import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import User from '@/models/User';
import connectToDatabase from '@/lib/mongodb';
import { asyncHandler } from '@/utils/asyncHandler';

export const GET = asyncHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id).select('-password -refreshToken -sessionId');

  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
});

export const PUT = asyncHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { name, profilePicture, bio, learningGoal } = await req.json();

  await connectToDatabase();

  const user = await User.findById(session.user.id);

  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  if (name !== undefined) user.name = name;
  if (profilePicture !== undefined) user.profilePicture = profilePicture;
  if (bio !== undefined) user.bio = bio;
  if (learningGoal !== undefined) user.learningGoal = learningGoal;

  await user.save();

  return NextResponse.json({
    message: 'User updated successfully',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      bio: user.bio,
      learningGoal: user.learningGoal,
    }
  });
});

export const DELETE = asyncHandler(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();

  const user = await User.findByIdAndDelete(session.user.id);

  if (!user) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ message: 'User account deleted successfully' });
});
