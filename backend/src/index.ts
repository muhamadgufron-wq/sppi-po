import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import poRoutes from './routes/po.routes.js';
import approvalRoutes from './routes/approval.routes.js';
import keuanganRoutes from './routes/keuangan.routes.js';
import transferRoutes from './routes/transfer.routes.js';
import shoppingRoutes from './routes/shopping.routes.js';
import dapurRoutes from './routes/dapur.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const corsOptions = {
  origin: true, // Allow all origins (or configure as needed)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Debug Middleware
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  // Log headers for debugging CORS
  // console.log('[DEBUG] Headers:', req.headers);
  next();
});

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Root debug route
app.get('/', (req, res) => {
  res.json({ message: 'SPPI Backend is running', env: process.env.NODE_ENV });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/po', poRoutes);
app.use('/api/approval', approvalRoutes);
app.use('/api/keuangan', keuanganRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/shopping', shoppingRoutes);
app.use('/api/dapur', dapurRoutes);
app.use('/api/invoices', invoiceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan'
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan server',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('Gagal koneksi ke database. Server tidak dapat dijalankan.');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log('🚀 SPPI Purchase Order System');
      console.log('='.repeat(50));
      console.log(`📡 Server running on: http://localhost:${PORT}`);
      console.log(`🗄️  Database: ${process.env.DB_NAME}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('='.repeat(50));
      console.log('\n✅ Server ready to accept requests\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server only if not in Vercel
if (!process.env.VERCEL) {
  startServer();
}

// Export for Vercel
export default app;
