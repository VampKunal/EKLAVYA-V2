import mongoose from 'mongoose';

export interface ICourse extends mongoose.Document {
  title: string;
  description: string;
  subjects: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  thumbnail?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new mongoose.Schema<ICourse>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    thumbnail: { type: String },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);
