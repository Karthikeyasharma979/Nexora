import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const questionSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  text: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOption: { type: Number, required: true },
  sectionName: { type: String }
});

const testSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  duration: { type: Number, required: true },
  requireCamera: { type: Boolean, default: true },
  startTime: { type: String, default: null },
  endTime: { type: String, default: null },
  moduleType: { type: String, default: 'quiz' },
  targetUrl: { type: String, default: '' },
  requireSEB: { type: Boolean, default: true },
  questions: [questionSchema]
}, { timestamps: true });

const Test = mongoose.model('Test', testSchema);

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const screenshotTest = {
      id: 'screenshot-demo',
      name: 'UI Screenshot Test',
      duration: 3600,
      requireCamera: false,
      requireSEB: false,
      questions: [
        {
          id: 1,
          text: 'What is the capital of France?',
          options: ['London', 'Berlin', 'Paris', 'Madrid'],
          correctOption: 2,
          sectionName: 'Section 1'
        },
        {
          id: 2,
          text: 'Which planet is known as the Red Planet?',
          options: ['Venus', 'Jupiter', 'Mars', 'Saturn'],
          correctOption: 2,
          sectionName: 'Section 1'
        },
        {
          id: 3,
          text: 'What is the largest ocean on Earth?',
          options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
          correctOption: 3,
          sectionName: 'Section 1'
        },
        {
          id: 4,
          text: 'Who wrote "Romeo and Juliet"?',
          options: ['Charles Dickens', 'William Shakespeare', 'Mark Twain', 'Jane Austen'],
          correctOption: 1,
          sectionName: 'Section 1'
        },
        {
          id: 5,
          text: 'What is the chemical symbol for Gold?',
          options: ['Ag', 'Fe', 'Au', 'Cu'],
          correctOption: 2,
          sectionName: 'Section 1'
        },
        ...Array.from({ length: 45 }).map((_, i) => ({
          id: i + 6,
          text: `Sample question number ${i + 6} for UI testing purposes?`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctOption: Math.floor(Math.random() * 4),
          sectionName: 'Section 1' // All in one section
        }))
      ]
    };

    // Remove if already exists
    await Test.deleteOne({ id: 'screenshot-demo' });

    await Test.create(screenshotTest);
    console.log('Successfully created test with ID: screenshot-demo');
    console.log('You can access it by navigating to /#/test/screenshot-demo in your app.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

run();
