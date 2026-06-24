import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { connectDB } from './config/db';
import { setupSocket } from './socket';
import authRoutes from './routes/auth';
import friendsRoutes from './routes/friends';
import adminRoutes from './routes/admin';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/admin', adminRoutes);

// Socket.io
const io = setupSocket(server);

// Make io available to routes if needed
app.set('io', io);

// Start server
async function start() {
  await connectDB();

  server.listen(config.port, () => {
    console.log(`
🚀 WalkieTalk API Server running!
📡 HTTP:   http://localhost:${config.port}
🔌 Socket: ws://localhost:${config.port}
🗄️  MongoDB: Connected
    `);
  });
}

start().catch(console.error);
