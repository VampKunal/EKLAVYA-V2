import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import User from '@/models/User';
import connectToDatabase from '@/lib/mongodb';
import { asyncHandler } from '@/utils/asyncHandler';

export const POST = asyncHandler(async (req: Request) => {
  const { name, email, password, role } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ message: 'Please provide all required fields' }, { status: 400 });
  }

  await connectToDatabase();

  const userExists = await User.findOne({ email });

  if (userExists) {
    return NextResponse.json({ message: 'User already exists' }, { status: 400 });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role || 'student',
  });

  return NextResponse.json({
    message: 'User registered successfully',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
  }, { status: 201 });
});
