import mongoose from 'mongoose';

export interface ISubject extends mongoose.Document {
  name: string;
  courseId: mongoose.Types.ObjectId;
  description?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new mongoose.Schema<ISubject>(
  {
    name: { type: String, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    description: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);
