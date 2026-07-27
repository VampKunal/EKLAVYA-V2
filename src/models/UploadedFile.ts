import mongoose from 'mongoose';

export interface IUploadedFile extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  originalName: string;
  storagePath: string;
  fileType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  embeddingsCount: number;
  createdAt: Date;
}

const UploadedFileSchema = new mongoose.Schema<IUploadedFile>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    originalName: { type: String, required: true },
    storagePath: { type: String, required: true },
    fileType: { type: String, required: true },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    embeddingsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.UploadedFile || mongoose.model<IUploadedFile>('UploadedFile', UploadedFileSchema);
