import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let memoryServerInstance = null;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const configuredUri = process.env.MONGODB_URI;

  // 1. If MONGODB_URI is explicitly provided for cloud/remote (e.g. MongoDB Atlas) or running in production
  if (configuredUri && (isProduction || configuredUri.startsWith('mongodb+srv://') || (!configuredUri.includes('127.0.0.1') && !configuredUri.includes('localhost')))) {
    console.log(`[Database] Connecting to configured MongoDB (${configuredUri.startsWith('mongodb+srv://') ? 'Atlas Cloud Cluster' : 'Remote Instance'})...`);
    try {
      await mongoose.connect(configuredUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      console.log('[Database] Successfully connected to MongoDB Atlas / Remote Cluster');
      return;
    } catch (err) {
      console.error('[Database] Failed to connect to MongoDB Atlas / Remote Cluster:', err.message);
      throw err; // In production or explicit Atlas setup, do not silently fallback to ephemeral memory
    }
  }

  // 2. Local development flow:
  // Check if an active instance URI is cached in server/data/active_uri.json
  const uriCachePath = path.resolve(__dirname, '../data/active_uri.json');
  let cachedUri = null;
  if (fs.existsSync(uriCachePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(uriCachePath, 'utf8'));
      if (data && data.uri) cachedUri = data.uri;
    } catch (e) {}
  }

  const defaultUri = configuredUri || 'mongodb://127.0.0.1:27017/smart_course_registration';
  const tryUris = cachedUri ? [cachedUri, defaultUri] : [defaultUri];

  for (const uri of tryUris) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      console.log(`[Database] Connected to local MongoDB at ${uri}`);
      return;
    } catch (err) {
      // Continue to next uri or fallback
    }
  }

  // If in production, do not start MongoMemoryServer
  if (isProduction) {
    throw new Error('[Database] MongoDB connection failed in production. Please check MONGODB_URI and IP access whitelist (0.0.0.0/0) in MongoDB Atlas.');
  }

  console.log('[Database] Initializing persistent local MongoDB engine at server/data/db...');

  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const dbPath = path.resolve(__dirname, '../data/db');
    fs.mkdirSync(dbPath, { recursive: true });

    // Attempt preferred port 27017 first; if unavailable, MongoMemoryServer picks an available port
    try {
      memoryServerInstance = await MongoMemoryServer.create({
        instance: {
          port: 27017,
          dbPath,
          storageEngine: 'wiredTiger',
          dbName: 'smart_course_registration',
        },
      });
    } catch (portErr) {
      console.log('[Database] Port 27017 busy, acquiring available local port...');
      memoryServerInstance = await MongoMemoryServer.create({
        instance: {
          dbPath,
          storageEngine: 'wiredTiger',
          dbName: 'smart_course_registration',
        },
      });
    }

    const memUri = memoryServerInstance.getUri('smart_course_registration');
    fs.writeFileSync(uriCachePath, JSON.stringify({ uri: memUri, pid: process.pid, time: new Date().toISOString() }));
    await mongoose.connect(memUri);
    console.log(`[Database] Successfully connected to persistent local MongoDB at ${memUri} (path: ${dbPath})`);
  } catch (fallbackErr) {
    console.error('[Database] Failed to initialize MongoDB connection:', fallbackErr);
    throw fallbackErr;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
      memoryServerInstance = null;
      const uriCachePath = path.resolve(__dirname, '../data/active_uri.json');
      if (fs.existsSync(uriCachePath)) {
        try { fs.unlinkSync(uriCachePath); } catch (e) {}
      }
    }
    console.log('[Database] Disconnected from MongoDB');
  } catch (err) {
    console.error('[Database] Error disconnecting DB:', err);
  }
};
