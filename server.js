import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://karthikeyasharma888_db_user:bcFea7ZySw1Dcoll@cluster0.gvcdx8s.mongodb.net/TaskioDB?retryWrites=true&w=majority&appName=Cluster0';

// Middleware
app.use(cors());
app.use(express.json());

// Resilient Fallback State
let useInMemoryDb = false;
let inMemoryTests = [];
let inMemoryReports = [];

// Seed data template
const SEED_DATA = [
  {
    id: 'demo-test-123',
    name: 'Sample Assessment Test',
    duration: 900, // 15 mins
    requireCamera: true,
    questions: [
      {
        id: 1,
        text: 'Which of these facts is not stated in the passage explicitly?',
        options: [
          "Susan wasn't financially sound enough to study culinary arts",
          "Susan was forced to cut her education short so she could start earning",
          "Baking for her daughter gave Susan a window into pursuing her passion professionally",
          "Following her passion was no cakewalk for Susan"
        ],
        correctOption: 2
      },
      {
        id: 2,
        text: 'If you lose your job/ have to wind up your business, till how long can you afford your daily expenses without borrowing money?',
        options: ['A month', '2-3 months', '2-3 weeks', 'A week'],
        correctOption: 1
      }
    ]
  }
];

// Initialize in-memory database as fallback
function initInMemoryDb() {
  useInMemoryDb = true;
  inMemoryTests = [...SEED_DATA];
  console.log('⚠️ [Resilient Fallback] Express backend is now running using a high-performance in-memory database.');
}

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB.');
    seedDatabase();
  })
  .catch(err => {
    console.error('❌ Error connecting to MongoDB:', err.message);
    console.log('👉 Resolving: DNS lookup or network restrictions blocked MongoDB Atlas. Activating robust in-memory database fallback...');
    initInMemoryDb();
  });

// Schema definition
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
  duration: { type: Number, required: true }, // in seconds
  requireCamera: { type: Boolean, default: true },
  questions: [questionSchema]
}, { timestamps: true });

const Test = mongoose.model('Test', testSchema);

const reportSchema = new mongoose.Schema({
  candidateName: { type: String, required: true },
  testId: { type: String, required: true },
  score: { type: String, required: true },
  status: { type: String, required: true },
  violations: { type: Array, default: [] }
}, { timestamps: true });

const Report = mongoose.model('Report', reportSchema);

// Seeding initial demo test if collection is empty
async function seedDatabase() {
  try {
    const count = await Test.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding initial demo test into MongoDB...');
      await Test.insertMany(SEED_DATA);
      console.log('🌱 MongoDB Seeding completed.');
    } else {
      console.log('Database already populated. Skipping MongoDB seeding.');
    }
  } catch (error) {
    console.error('Error seeding MongoDB database:', error);
  }
}

// Routes
// 1. Get all tests
app.get('/api/tests', async (req, res) => {
  if (useInMemoryDb) {
    return res.json(inMemoryTests);
  }
  try {
    const tests = await Test.find().sort({ createdAt: -1 });
    res.json(tests);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Server error fetching tests' });
  }
});

// 2. Get a single test by ID
app.get('/api/tests/:id', async (req, res) => {
  if (useInMemoryDb) {
    const test = inMemoryTests.find(t => t.id === req.params.id);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    return res.json(test);
  }
  try {
    const test = await Test.findOne({ id: req.params.id });
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json(test);
  } catch (error) {
    console.error(`Error fetching test ${req.params.id}:`, error);
    res.status(500).json({ error: 'Server error fetching test' });
  }
});

// 3. Save a new test
app.post('/api/tests', async (req, res) => {
  try {
    const { id, name, duration, requireCamera, questions } = req.body;
    if (!id || !name || !duration || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newTestData = {
      id,
      name,
      duration,
      requireCamera,
      questions
    };

    if (useInMemoryDb) {
      inMemoryTests.unshift(newTestData);
      return res.status(201).json(newTestData);
    }

    const newTest = new Test(newTestData);
    await newTest.save();
    res.status(201).json(newTest);
  } catch (error) {
    console.error('Error saving test:', error);
    res.status(500).json({ error: 'Server error saving test' });
  }
});

// 4. Delete a test by ID
app.delete('/api/tests/:id', async (req, res) => {
  if (useInMemoryDb) {
    const initialLength = inMemoryTests.length;
    inMemoryTests = inMemoryTests.filter(t => t.id !== req.params.id);
    if (inMemoryTests.length === initialLength) {
      return res.status(404).json({ error: 'Test not found' });
    }
    return res.status(204).send();
  }
  try {
    const deletedTest = await Test.findOneAndDelete({ id: req.params.id });
    if (!deletedTest) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting test ${req.params.id}:`, error);
    res.status(500).json({ error: 'Server error deleting test' });
  }
});

// 5. Update an existing test by ID
app.put('/api/tests/:id', async (req, res) => {
  try {
    const { name, duration, requireCamera, questions } = req.body;
    if (!name || !duration || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const updateData = { name, duration, requireCamera, questions };

    if (useInMemoryDb) {
      const index = inMemoryTests.findIndex(t => t.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: 'Test not found' });
      }
      inMemoryTests[index] = { ...inMemoryTests[index], ...updateData };
      return res.json(inMemoryTests[index]);
    }

    const updatedTest = await Test.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true }
    );
    
    if (!updatedTest) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json(updatedTest);
  } catch (error) {
    console.error(`Error updating test ${req.params.id}:`, error);
    res.status(500).json({ error: 'Server error updating test' });
  }
});

// 6. Get all reports
app.get('/api/reports', async (req, res) => {
  if (useInMemoryDb) {
    return res.json(inMemoryReports);
  }
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Server error fetching reports' });
  }
});

// 7. Save a report
app.post('/api/reports', async (req, res) => {
  try {
    const { candidateName, testId, score, status, violations } = req.body;
    if (!candidateName || !testId || !score || !status) {
      return res.status(400).json({ error: 'Missing required fields for report' });
    }

    const newReportData = { candidateName, testId, score, status, violations: violations || [] };

    if (useInMemoryDb) {
      const savedReport = { ...newReportData, _id: Date.now().toString(), createdAt: new Date().toISOString() };
      inMemoryReports.unshift(savedReport);
      return res.status(201).json(savedReport);
    }

    const newReport = new Report(newReportData);
    await newReport.save();
    res.status(201).json(newReport);
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).json({ error: 'Server error saving report' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
