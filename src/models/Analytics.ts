import mongoose from 'mongoose';

export interface IAnalytics extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  dailyActivity: { date: Date; durationMinutes: number }[];
  weeklyAccuracy: { weekStartDate: Date; accuracy: number }[];
  retentionScores: { topic: string; score: number }[];
}

const AnalyticsSchema = new mongoose.Schema<IAnalytics>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    dailyActivity: [
      {
        date: { type: Date, required: true },
        durationMinutes: { type: Number, default: 0 },
      }
    ],
    weeklyAccuracy: [
      {
        weekStartDate: { type: Date, required: true },
        accuracy: { type: Number, default: 0 },
      }
    ],
    retentionScores: [
      {
        topic: { type: String, required: true },
        score: { type: Number, default: 0 },
      }
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Analytics || mongoose.model<IAnalytics>('Analytics', AnalyticsSchema);
