import mongoose from 'mongoose';

export interface IQuizAttempt extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  questions: {
    questionText: string;
    options: string[];
    correctAnswer: string;
    userAnswer: string;
    isCorrect: boolean;
  }[];
  score: number;
  timeTaken: number;
  createdAt: Date;
}

const QuizAttemptSchema = new mongoose.Schema<IQuizAttempt>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    questions: [
      {
        questionText: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctAnswer: { type: String, required: true },
        userAnswer: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
      }
    ],
    score: { type: Number, required: true },
    timeTaken: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.QuizAttempt || mongoose.model<IQuizAttempt>('QuizAttempt', QuizAttemptSchema);
