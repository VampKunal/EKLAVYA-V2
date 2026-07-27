import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';
import Course from '../src/models/Course';
import Subject from '../src/models/Subject';
import User from '../src/models/User';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.create({
        name: 'Admin User',
        email: 'admin@eklavya.ai',
        role: 'admin',
      });
      console.log('Created dummy admin user');
    }

    const courses = [
      {
        title: 'Data Structures & Algorithms',
        description: 'Master core CS concepts with hands-on practice.',
        isPublic: true,
        createdBy: admin._id,
        subjects: [
          { name: 'Arrays & Strings', description: 'Basic array manipulation', order: 1 },
          { name: 'Trees & Graphs', description: 'Advanced non-linear data structures', order: 2 },
        ]
      },
      {
        title: 'Full Stack Web Development',
        description: 'Learn to build modern web applications from scratch.',
        isPublic: true,
        createdBy: admin._id,
        subjects: [
          { name: 'React Fundamentals', description: 'Components, state, and props', order: 1 },
          { name: 'Node.js Backend', description: 'Building REST APIs with Express', order: 2 },
        ]
      },
      {
        title: 'Machine Learning Bootcamp',
        description: 'Introduction to predictive modeling and neural networks.',
        isPublic: true,
        createdBy: admin._id,
        subjects: [
          { name: 'Supervised Learning', description: 'Regression and Classification', order: 1 },
          { name: 'Deep Learning', description: 'Introduction to PyTorch/TensorFlow', order: 2 },
        ]
      }
    ];

    for (const courseData of courses) {
      const existingCourse = await Course.findOne({ title: courseData.title });
      if (!existingCourse) {
        const newCourse = await Course.create({
          title: courseData.title,
          description: courseData.description,
          isPublic: courseData.isPublic,
          createdBy: courseData.createdBy,
        });

        const subjectIds = [];
        for (const sub of courseData.subjects) {
          const newSubject = await Subject.create({
            ...sub,
            courseId: newCourse._id,
          });
          subjectIds.push(newSubject._id);
        }

        newCourse.subjects = subjectIds;
        await newCourse.save();
        console.log(`Created course: ${newCourse.title}`);
      } else {
        console.log(`Course already exists: ${courseData.title}`);
      }
    }

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

seedData();
