import mongoose from 'mongoose';

export interface IWeakTopic {
  topic: string;
  subTopic?: string;
  accuracy: number;
  recommendedAction: string;
  updatedAt: Date;
}

export interface ITopicPracticed {
  topic: string;
  subTopic?: string;
  attempts: number;
  averageScore: number;
  lastPracticed: Date;
}

export interface IUserProgress extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  topicsMastered: string[];
  weakTopics: IWeakTopic[];
  topicsPracticed: ITopicPracticed[];
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
    weakTopics: [
      {
        topic: { type: String, required: true },
        subTopic: { type: String },
        accuracy: { type: Number, required: true },
        recommendedAction: { type: String, required: true },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    topicsPracticed: [
      {
        topic: { type: String, required: true },
        subTopic: { type: String },
        attempts: { type: Number, default: 1 },
        averageScore: { type: Number, default: 0 },
        lastPracticed: { type: Date, default: Date.now },
      },
    ],
    accuracy: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.UserProgress || mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);

