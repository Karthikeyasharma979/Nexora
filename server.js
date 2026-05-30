import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://karthikeyasharma888_db_user:bcFea7ZySw1Dcoll@cluster0.gvcdx8s.mongodb.net/TaskioDB?retryWrites=true&w=majority&appName=Cluster0';

// Middleware
app.use(cors());
app.use(express.json());

// Auth Middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_nexora_jwt_key_2026');
    if (decoded.role !== 'admin') throw new Error('Not admin');
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Forbidden: Invalid token' });
  }
};

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

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB connection lost. Automatically switching to in-memory fallback mode.');
  if (!useInMemoryDb) initInMemoryDb();
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB runtime error:', err.message);
  if (!useInMemoryDb) initInMemoryDb();
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
  startTime: { type: String, default: null },
  endTime: { type: String, default: null },
  moduleType: { type: String, default: 'quiz' },
  targetUrl: { type: String, default: '' },
  requireSEB: { type: Boolean, default: true },
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

const demoRequestSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  company: { type: String, required: true },
  testVolume: { type: String, required: true },
  useCase: { type: String, required: true }
}, { timestamps: true });

const DemoRequest = mongoose.model('DemoRequest', demoRequestSchema);

// In-memory fallback for demo requests
let inMemoryDemoRequests = [];

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

// Health Check / Keep-Alive Route (For Cron Jobs)
app.get('/', (req, res) => {
  res.status(200).send('Nexora Backend Server is up and running!');
});

// 1. Get all tests (Admin Only)
app.get('/api/tests', authenticateAdmin, async (req, res) => {
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
app.post('/api/tests', authenticateAdmin, async (req, res) => {
  try {
    const { id, name, duration, requireCamera, questions, startTime, endTime, moduleType, targetUrl, requireSEB } = req.body;
    if (!id || !name || !duration) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newTestData = {
      id,
      name,
      duration,
      requireCamera,
      startTime,
      endTime,
      moduleType: moduleType || 'quiz',
      targetUrl: targetUrl || '',
      requireSEB: requireSEB !== undefined ? requireSEB : true,
      questions: questions || []
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
app.delete('/api/tests/:id', authenticateAdmin, async (req, res) => {
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
app.put('/api/tests/:id', authenticateAdmin, async (req, res) => {
  try {
    const { name, duration, requireCamera, questions, startTime, endTime, moduleType, targetUrl, requireSEB } = req.body;
    if (!name || !duration) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const updateData = { 
      name, 
      duration, 
      requireCamera, 
      startTime, 
      endTime, 
      moduleType: moduleType || 'quiz', 
      targetUrl: targetUrl || '', 
      requireSEB: requireSEB !== undefined ? requireSEB : true,
      questions: questions || [] 
    };

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
app.get('/api/reports', authenticateAdmin, async (req, res) => {
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

// 8. Save a demo request
app.post('/api/demo-requests', async (req, res) => {
  try {
    const { firstName, lastName, email, company, testVolume, useCase } = req.body;
    if (!firstName || !lastName || !email || !company) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const requestData = { firstName, lastName, email, company, testVolume, useCase };

    if (useInMemoryDb) {
      const savedRequest = { ...requestData, _id: Date.now().toString(), createdAt: new Date().toISOString() };
      inMemoryDemoRequests.unshift(savedRequest);
      return res.status(201).json(savedRequest);
    }

    const newRequest = new DemoRequest(requestData);
    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Error saving demo request:', error);
    res.status(500).json({ error: 'Server error saving demo request' });
  }
});

// --- ADMIN & SECURE INVITE ROUTES ---

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (password === adminPassword) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'super_secret_nexora_jwt_key_2026', { expiresIn: '12h' });
    return res.json({ token });
  } else {
    return res.status(401).json({ error: 'Invalid password' });
  }
});

// Generate Secure Invite (Admin Only)
app.post('/api/invite/generate', authenticateAdmin, (req, res) => {
  const { testId, candidateEmail } = req.body;
  if (!testId) return res.status(400).json({ error: 'testId is required' });

  const token = jwt.sign(
    { testId, candidateEmail, type: 'invite' },
    process.env.JWT_SECRET || 'super_secret_nexora_jwt_key_2026',
    { expiresIn: '7d' } // Link valid for 7 days
  );
  
  res.json({ token, link: `nexora://invite/${token}` });
});

// Verify Secure Invite Logic
app.get('/api/invite/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // 1. Verify JWT
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'super_secret_nexora_jwt_key_2026'
    );
    
    if (decoded.type !== 'invite') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    // 2. Fetch the test to check if requireSEB is enabled
    let requireSEB = true;
    let test = null;
    if (useInMemoryDb) {
      test = inMemoryTests.find(t => t.id === decoded.testId);
    } else {
      test = await Test.findOne({ id: decoded.testId });
    }
    
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    if (test.requireSEB !== undefined) {
      requireSEB = test.requireSEB;
    }

    res.json({ testId: decoded.testId, candidateEmail: decoded.candidateEmail, requireSEB, test });
  } catch (error) {
    console.error('Invite verification failed:', error.message);
    res.status(403).json({ error: 'Invalid or expired invite link' });
  }
});

// Send Email Invite (Admin Only)
app.post('/api/invite/send-email', authenticateAdmin, async (req, res) => {
  const { testId, testName, candidateEmail } = req.body;
  if (!testId || !candidateEmail) {
    return res.status(400).json({ error: 'Missing testId or candidateEmail' });
  }

  try {
    // Generate token
    const token = jwt.sign(
      { testId, candidateEmail, type: 'invite' },
      process.env.JWT_SECRET || 'super_secret_nexora_jwt_key_2026',
      { expiresIn: '7d' }
    );
    const secureLink = `nexora://invite/${token}`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const fallbackLink = `${frontendUrl}/#/invite/${token}`;

    // Setup Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const mailOptions = {
      from: `"Nexora Assessments" <${process.env.EMAIL_USERNAME}>`,
      to: candidateEmail,
      subject: `Invitation for Assessment: ${testName || 'Aptitude Test'}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; border: 1px solid #ddd; background-color: #f9f9f9;">
          <div style="background-color: #0b1a30; padding: 20px;">
             <h2 style="color: #00b4d8; margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">Nexora<span style="color:#fff;">Secure</span></h2>
          </div>
          
          <div style="padding: 30px;">
            <p>Dear Candidate,</p>
            <p>Greetings from Nexora!</p>
            <p>We are pleased to inform you that you have been shortlisted for the upcoming <strong>${testName || 'aptitude assessment'}</strong>.</p>
            <p>We request you to kindly go through the below mentioned mandatory prerequisites guidelines well in advance to ensure a smooth assessment experience.</p>
            
            <div style="background-color: #eef2f5; padding: 20px; border-radius: 5px; margin-top: 30px;">
              <h3 style="color: #2c3e50; margin-top: 0;">Important points:</h3>
              <ul style="line-height: 1.6; color: #444;">
                <li>Take the assessment in a quiet, noise-free and well-lit environment.</li>
                <li>Ensure your webcam is functional and well connected. You will be monitored via webcam during the assessment.</li>
                <li>Require stable internet connection with minimum 512 kbps speed.</li>
                <li><strong>Only one attempt is available.</strong> Ensure laptop battery is fully charged.</li>
                <li><strong>Do not press F5 or refresh during the exam</strong> - as it would auto-submit and end the assessment.</li>
              </ul>
            </div>

            <p style="margin-top: 30px;">The assessment window is now open. To begin your assessment, please open the <strong>Nexora Secure Browser</strong> on your computer and enter the following Access Key:</p>
            
            <div style="background-color: #f1f5f9; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <span style="font-family: monospace; font-size: 14px; color: #0f172a; word-break: break-all;">${token}</span>
            </div>
            
            <p style="font-size: 12px; color: #666; margin-top: 5px;">If you do not have the application installed, please contact your administrator for the installer.</p>
            
            <p style="margin-top: 40px;">Wishing you all the best for the assessment!</p>
            <p>Regards,<br/><strong>Talent Acquisition Team</strong></p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email sent successfully', secureLink });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});


// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
