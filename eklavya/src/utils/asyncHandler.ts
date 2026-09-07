import { NextResponse } from 'next/server';

export const asyncHandler = (fn: Function) => async (req: Request, ...args: any[]) => {
  try {
    return await fn(req, ...args);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: error.statusCode || 500 }
    );
  }
};
