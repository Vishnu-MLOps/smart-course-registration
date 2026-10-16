import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import sectionRoutes from './routes/sectionRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import academicRoutes from './routes/academicRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Determine allowed client origins for CORS
const getAllowedOrigins = () => {
  const clientEnv = process.env.CLIENT_URL;
  if (!clientEnv || clientEnv === '*') return null;
  return clientEnv.split(',').map((url) => url.trim().replace(/\/+$/, ''));
};

const allowedOrigins = getAllowedOrigins();

// Security & Parsing Middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // If no CLIENT_URL restriction configured, allow the origin
      if (!allowedOrigins) return callback(null, true);

      // Match exact origin from list
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Support Vercel preview domains if a vercel app is in allowed origins
      const isVercelAllowed = allowedOrigins.some((o) => o.includes('.vercel.app'));
      if (isVercelAllowed && origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      callback(new Error(`CORS policy rejection: Origin ${origin} is not allowed.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(express.json());

// Service root & health check endpoints
app.get('/', (req, res) => {
  res.json({
    service: 'Smart Course Registration and Academic Planning API',
    status: 'online',
    health: '/api/health',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Smart Course Registration and Academic Planning API',
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Centralized error handling
app.use(errorHandler);

// Connect DB and start listening
let server = null;

export const startServer = async () => {
  await connectDB();

  // Idempotently ensure courses, sections, rules and student records exist
  try {
    const { Course } = await import('./models/Course.js');
    const count = await Course.countDocuments();
    if (count === 0) {
      console.log('[Server] Database has no courses. Auto-initializing catalog and demonstration data...');
      const { seedDatabase } = await import('./seed/seed.js');
      await seedDatabase({ shouldDisconnect: false, resetUsers: false });
    } else {
      const { ensureStudentRecords } = await import('./seed/seed.js');
      await ensureStudentRecords();
    }

    // Clean any orphaned or dangling records from prior restarts
    const { cleanOrphanedRecords } = await import('./scripts/cleanOrphans.js');
    await cleanOrphanedRecords();
  } catch (seedErr) {
    console.error('[Server] Warning: Auto-initialization check encountered an error:', seedErr.message);
  }

  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      resolve(server);
    });
  });
};

import { fileURLToPath } from 'url';

// Start server only when executed directly as main script
const isDirectRun = process.argv[1] && (
  fileURLToPath(import.meta.url) === process.argv[1] ||
  process.argv[1].endsWith('server.js')
);

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
