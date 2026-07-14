const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { createClient } = require('@supabase/supabase-js');
const logger = require('./middleware/logger');
require('dotenv').config();

const app = express();

// Initialize Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
global.supabase = supabase; // Make supabase available globally

// Security headers
app.use(helmet());

// CORS: restrict to allowed origin when provided
const allowed = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowed === '*' ? true : allowed }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.RATE_LIMIT_MAX) || 200 });
app.use(limiter);

app.use(express.json());

// HTTP request logging via morgan -> winston
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

app.get('/', (req, res) => {
  res.json({
    message: 'GLB Bank backend is running',
    version: '1.0.0',
    endpoints: ['/api/auth/register', '/api/auth/login', '/api/accounts', '/api/transactions']
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/profile', require('./routes/profile'));

// basic centralized error handler
app.use((err, req, res, next) => {
  logger.error(err && err.stack ? err.stack : String(err));
  res.status(500).json({ message: 'Internal server error' });
});

const { seedAdmin } = require('./seedAdmin');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test Supabase connection
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    
    if (error) {
      throw new Error(`Supabase connection test failed: ${error.message}`);
    }

    console.log('Supabase connected successfully');

    const server = app.listen(PORT, async () => {
      console.log(`Server running on port ${PORT}`);
      try {
        await seedAdmin();
      } catch (error) {
        console.error('Admin seeding failed:', error.message);
      }
    });

    server.on('error', (err) => {
      console.error('Server failed to start:', err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error('Supabase connection failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
