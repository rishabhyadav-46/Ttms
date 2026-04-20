/** 

require('dotenv').config();

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const app = express();

const PORT = process.env.PORT || 3001;
const path1 = path.join(__dirname, 'public');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Create logs directory if it doesn't exist
if (!fs.existsSync('./logs')) {
  fs.mkdirSync('./logs');
}

const logFile = fs.createWriteStream('./logs/app.log', { flags: 'a' });

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  logFile.write(logMessage);
  process.stdout.write(logMessage);
};

log('========== SERVER STARTING ==========');
log('DATABASE_URL: ' + (process.env.DATABASE_URL ? '✅ Loaded' : '❌ Not loaded'));
log('🔗 Prisma ready (connects to Supabase PostgreSQL on first query)');

// Global error handlers
process.on('uncaughtException', (error) => {
  log('❌ UNCAUGHT EXCEPTION: ' + error.message);
  log('Stack: ' + error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('❌ UNHANDLED REJECTION: ' + reason);
  log('Promise: ' + promise);
});

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    log(`📨 ${req.method} ${req.path} - Body: ${JSON.stringify(req.body)}`);
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// ============== MIDDLEWARE ==============
// JWT Authentication Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ============== PAGE ROUTES ==============
app.get('/', (req, res) => {
  res.sendFile(path.join(path1, 'index.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(path1, 'signup.html'));
});

app.get('/entrydetails', (req, res) => {
  res.sendFile(path.join(path1, 'entrydetails.html'));
});

app.get('/loginpage', (req, res) => {
  res.sendFile(path.join(path1, 'loginpage.html'));
});

app.get('/report', (req, res) => {
  res.sendFile(path.join(path1, 'report.html'));
});

// ============== AUTHENTICATION ROUTES ==============

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    log('✅ Signup endpoint hit');
    log('Request body: ' + JSON.stringify(req.body));
    
    const { fullName, companyName, email, password, confirmPassword } = req.body;

    // Validation
    if (!fullName || !companyName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        fullName,
        companyName,
        email,
        password: hashedPassword,
        role: 'operator'
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        companyName: newUser.companyName
      }
    });
  } catch (error) {
    log('❌ Signup error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        companyName: user.companyName,
        role: user.role
      }
    });
  } catch (error) {
    log('❌ Login error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============== GATE ENTRY ROUTES ==============
// Create new gate entry
app.post('/api/gate-entries', verifyToken, async (req, res) => {
  try {
    const {
      gateEntryNo,
      vehicleNumber,
      vehicleType,
      transporter,
      inwardType,
      location,
      reportingTimeDate,
      inDateTime,
      tareWeight
    } = req.body;

    // Validation
    if (!gateEntryNo || !vehicleNumber || !vehicleType || !transporter || !inwardType || !location) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    // Create gate entry
    const newEntry = await prisma.gateEntry.create({
      data: {
        gateEntryNo,
        vehicleNumber,
        vehicleType,
        transporter,
        inwardType,
        location,
        reportingTimeDate: reportingTimeDate ? new Date(reportingTimeDate) : new Date(),
        inDateTime: inDateTime ? new Date(inDateTime) : null,
        tareWeight: parseFloat(tareWeight) || 0,
        status: 'completed',
        userId: req.userId
      }
    });

    res.status(201).json({
      message: 'Gate entry created successfully',
      data: newEntry
    });
  } catch (error) {
    log('❌ Gate entry creation error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all gate entries for current user
app.get('/api/gate-entries', verifyToken, async (req, res) => {
  try {
    const entries = await prisma.gateEntry.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      total: entries.length,
      data: entries
    });
  } catch (error) {
    log('❌ Get gate entries error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get single gate entry
app.get('/api/gate-entries/:id', verifyToken, async (req, res) => {
  try {
    const entry = await prisma.gateEntry.findUnique({
      where: { id: req.params.id },
      include: { user: true }
    });

    if (!entry) {
      return res.status(404).json({ error: 'Gate entry not found' });
    }

    // Check if user owns this entry
    if (entry.userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update gate entry
app.put('/api/gate-entries/:id', verifyToken, async (req, res) => {
  try {
    const entry = await prisma.gateEntry.findUnique({
      where: { id: req.params.id }
    });

    if (!entry) {
      return res.status(404).json({ error: 'Gate entry not found' });
    }

    if (entry.userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedEntry = await prisma.gateEntry.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json({
      message: 'Gate entry updated successfully',
      data: updatedEntry
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== REPORT ROUTES ==============
// Get analytics dashboard data
app.get('/api/reports/dashboard', verifyToken, async (req, res) => {
  try {
    // Total entries for user
    const totalEntries = await prisma.gateEntry.count({
      where: { userId: req.userId }
    });

    // Pending entries
    const pendingEntries = await prisma.gateEntry.count({
      where: { 
        userId: req.userId,
        status: 'pending'
      }
    });

    // Completed entries
    const completedEntries = await prisma.gateEntry.count({
      where: { 
        userId: req.userId,
        status: 'completed'
      }
    });

    // Average turnaround time (in hours)
    const allEntriesWithData = await prisma.gateEntry.findMany({
      where: { 
        userId: req.userId
      },
      select: {
        reportingTimeDate: true,
        inDateTime: true
      }
    });

    // Filter entries with non-null inDateTime
    const entriesWithTime = allEntriesWithData.filter(entry => entry.inDateTime !== null);

    let avgTurnaroundTime = 0;
    if (entriesWithTime.length > 0) {
      const totalHours = entriesWithTime.reduce((acc, entry) => {
        const diff = (new Date(entry.inDateTime) - new Date(entry.reportingTimeDate)) / (1000 * 60 * 60);
        return acc + diff;
      }, 0);
      avgTurnaroundTime = (totalHours / entriesWithTime.length).toFixed(2);
    }

    // Entries by vehicle type
    const byVehicleType = await prisma.gateEntry.groupBy({
      by: ['vehicleType'],
      where: { userId: req.userId },
      _count: { _all: true }
    });

    // Entries by inward type
    const byInwardType = await prisma.gateEntry.groupBy({
      by: ['inwardType'],
      where: { userId: req.userId },
      _count: { _all: true }
    });

    // Recent entries
    const recentEntries = await prisma.gateEntry.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({
      summary: {
        totalEntries,
        pendingEntries,
        completedEntries,
        avgTurnaroundTime
      },
      breakdown: {
        byVehicleType,
        byInwardType
      },
      recentEntries
    });
  } catch (error) {
    log('❌ Dashboard report error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed report with date filter
app.get('/api/reports/detailed', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause = { userId: req.userId };

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const entries = await prisma.gateEntry.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    // Calculate statistics
    const stats = {
      totalEntries: entries.length,
      totalWeight: entries.reduce((sum, entry) => sum + (entry.tareWeight || 0), 0),
      statusBreakdown: {
        pending: entries.filter(e => e.status === 'pending').length,
        completed: entries.filter(e => e.status === 'completed').length,
        cancelled: entries.filter(e => e.status === 'cancelled').length
      },
      vehicleTypes: [...new Set(entries.map(e => e.vehicleType))],
      transporters: [...new Set(entries.map(e => e.transporter))]
    };

    res.json({
      stats,
      entries
    });
  } catch (error) {
    log('❌ Detailed report error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============== UTILITY ROUTES ==============

// Server startup
app.listen(PORT, () => {
  log(`🚀 Server running on port ${PORT}`);
  log(`📝 Authentication:
  POST /api/auth/signup - Register new user
  POST /api/auth/login - Login user

🚪 Gate Entries:
  POST /api/gate-entries - Create new entry (requires auth)
  GET /api/gate-entries - Get all your entries (requires auth)
  GET /api/gate-entries/:id - Get single entry (requires auth)
  PUT /api/gate-entries/:id - Update entry (requires auth)

📊 Reports:
  GET /api/reports/dashboard - Dashboard analytics (requires auth)
  GET /api/reports/detailed - Detailed report with filters (requires auth)`);
});
**/





require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const User = require('./models/User')
const GateEntry = require('./models/GateEntry');

const app = express();

const PORT = process.env.PORT || 3001;
const path1 = path.join(__dirname, 'public');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gate_management';

// Create logs directory if it doesn't exist
if (!fs.existsSync('./logs')) {
  fs.mkdirSync('./logs');
}

const logFile = fs.createWriteStream('./logs/app.log', { flags: 'a' });

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  logFile.write(logMessage);
  process.stdout.write(logMessage);
};

log('========== SERVER STARTING ==========');
log('MONGODB_URI: ' + (process.env.MONGODB_URI ? '✅ Loaded' : '⚠️  Using default localhost'));

// Connect to MongoDB
console.log('Connecting to:', process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => { console.log('✅ Connected!'); })
  .catch((err) => {
    console.error('Code:', err.code);
    console.error('Name:', err.name);  
    console.error('Message:', err.message);
    process.exit(1);
  });

// Global error handlers
process.on('uncaughtException', (error) => {
  log('❌ UNCAUGHT EXCEPTION: ' + error.message);
  log('Stack: ' + error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('❌ UNHANDLED REJECTION: ' + reason);
  log('Promise: ' + promise);
});

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    log(`📨 ${req.method} ${req.path} - Body: ${JSON.stringify(req.body)}`);
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// ============== MIDDLEWARE ==============
// JWT Authentication Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ============== PAGE ROUTES ==============
app.get('/', (req, res) => res.sendFile(path.join(path1, 'index.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(path1, 'signup.html')));
app.get('/entrydetails', (req, res) => res.sendFile(path.join(path1, 'entrydetails.html')));
app.get('/loginpage', (req, res) => res.sendFile(path.join(path1, 'loginpage.html')));
app.get('/report', (req, res) => res.sendFile(path.join(path1, 'report.html')));

// ============== AUTHENTICATION ROUTES ==============

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    log('✅ Signup endpoint hit');

    const { fullName, companyName, email, password, confirmPassword } = req.body;

    if (!fullName || !companyName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const newUser = await User.create({
      fullName,
      companyName,
      email,
      password: hashedPassword,
      role: 'operator',
    });

    const token = jwt.sign({ id: newUser._id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        companyName: newUser.companyName,
      },
    });
  } catch (error) {
    log('❌ Signup error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        companyName: user.companyName,
        role: user.role,
      },
    });
  } catch (error) {
    log('❌ Login error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============== GATE ENTRY ROUTES ==============

// Create new gate entry
app.post('/api/gate-entries', verifyToken, async (req, res) => {
  try {
    const {
      gateEntryNo,
      vehicleNumber,
      vehicleType,
      transporter,
      inwardType,
      location,
      reportingTimeDate,
      inDateTime,
      tareWeight,
    } = req.body;

    if (!gateEntryNo || !vehicleNumber || !vehicleType || !transporter || !inwardType || !location) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    const newEntry = await GateEntry.create({
      gateEntryNo,
      vehicleNumber,
      vehicleType,
      transporter,
      inwardType,
      location,
      reportingTimeDate: reportingTimeDate ? new Date(reportingTimeDate) : new Date(),
      inDateTime: inDateTime ? new Date(inDateTime) : null,
      tareWeight: parseFloat(tareWeight) || 0,
      status: 'completed',
      userId: req.userId,
    });

    res.status(201).json({
      message: 'Gate entry created successfully',
      data: newEntry,
    });
  } catch (error) {
    log('❌ Gate entry creation error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all gate entries for current user
app.get('/api/gate-entries', verifyToken, async (req, res) => {
  try {
    const entries = await GateEntry.find({ userId: req.userId }).sort({ createdAt: -1 });

    res.json({
      total: entries.length,
      data: entries,
    });
  } catch (error) {
    log('❌ Get gate entries error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get single gate entry
app.get('/api/gate-entries/:id', verifyToken, async (req, res) => {
  try {
    const entry = await GateEntry.findById(req.params.id).populate('userId', 'fullName email companyName');

    if (!entry) {
      return res.status(404).json({ error: 'Gate entry not found' });
    }

    if (entry.userId._id.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update gate entry
app.put('/api/gate-entries/:id', verifyToken, async (req, res) => {
  try {
    const entry = await GateEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ error: 'Gate entry not found' });
    }

    if (entry.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedEntry = await GateEntry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,         // return the updated document
      runValidators: true,
    });

    res.json({
      message: 'Gate entry updated successfully',
      data: updatedEntry,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== REPORT ROUTES ==============

// Dashboard analytics
app.get('/api/reports/dashboard', verifyToken, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const [totalEntries, pendingEntries, completedEntries] = await Promise.all([
      GateEntry.countDocuments({ userId }),
      GateEntry.countDocuments({ userId, status: 'pending' }),
      GateEntry.countDocuments({ userId, status: 'completed' }),
    ]);

    // Average turnaround time (hours)
    const turnaroundAgg = await GateEntry.aggregate([
      { $match: { userId, inDateTime: { $ne: null } } },
      {
        $project: {
          diffHours: {
            $divide: [{ $subtract: ['$inDateTime', '$reportingTimeDate'] }, 3600000],
          },
        },
      },
      { $group: { _id: null, avgHours: { $avg: '$diffHours' } } },
    ]);
    const avgTurnaroundTime = turnaroundAgg.length
      ? parseFloat(turnaroundAgg[0].avgHours.toFixed(2))
      : 0;

    // Entries by vehicle type
    const byVehicleType = await GateEntry.aggregate([
      { $match: { userId } },
      { $group: { _id: '$vehicleType', count: { $sum: 1 } } },
      { $project: { vehicleType: '$_id', count: 1, _id: 0 } },
    ]);

    // Entries by inward type
    const byInwardType = await GateEntry.aggregate([
      { $match: { userId } },
      { $group: { _id: '$inwardType', count: { $sum: 1 } } },
      { $project: { inwardType: '$_id', count: 1, _id: 0 } },
    ]);

    // Recent 10 entries
    const recentEntries = await GateEntry.find({ userId }).sort({ createdAt: -1 }).limit(10);

    res.json({
      summary: { totalEntries, pendingEntries, completedEntries, avgTurnaroundTime },
      breakdown: { byVehicleType, byInwardType },
      recentEntries,
    });
  } catch (error) {
    log('❌ Dashboard report error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
});

// Detailed report with date filter
app.get('/api/reports/detailed', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = new mongoose.Types.ObjectId(req.userId);

    const filter = { userId };

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const entries = await GateEntry.find(filter).sort({ createdAt: -1 });

    const stats = {
      totalEntries: entries.length,
      totalWeight: entries.reduce((sum, e) => sum + (e.tareWeight || 0), 0),
      statusBreakdown: {
        pending:   entries.filter((e) => e.status === 'pending').length,
        completed: entries.filter((e) => e.status === 'completed').length,
        cancelled: entries.filter((e) => e.status === 'cancelled').length,
      },
      vehicleTypes:  [...new Set(entries.map((e) => e.vehicleType))],
      transporters:  [...new Set(entries.map((e) => e.transporter))],
    };

    res.json({ stats, entries });
  } catch (error) {
    log('❌ Detailed report error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============== SERVER STARTUP ==============
app.listen(PORT, () => {
  log(`🚀 Server running on port ${PORT}`);
  log(`📝 Authentication:
  POST /api/auth/signup - Register new user
  POST /api/auth/login  - Login user

🚪 Gate Entries:
  POST /api/gate-entries      - Create new entry (requires auth)
  GET  /api/gate-entries      - Get all your entries (requires auth)
  GET  /api/gate-entries/:id  - Get single entry (requires auth)
  PUT  /api/gate-entries/:id  - Update entry (requires auth)

📊 Reports:
  GET /api/reports/dashboard - Dashboard analytics (requires auth)
  GET /api/reports/detailed  - Detailed report with filters (requires auth)`);
});