import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password?: string;
  role: 'student' | 'admin';
  refreshToken?: string;
  sessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    refreshToken: { type: String },
    sessionId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
