import mongoose from 'mongoose';

export interface IUserProgress extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  topicsMastered: string[];
  accuracy: number;
  streakDays: number;
  lastActivity: Date;
}

const UserProgressSchema = new mongoose.Schema<IUserProgress>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    topicsMastered: [{ type: String }],
    accuracy: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.UserProgress || mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);
