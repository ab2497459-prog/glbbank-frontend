const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { createClient } = require('@supabase/supabase-js');
const logger = require('./middleware/logger');
require('dotenv').config();

const app = express();

// Initialize Supabase (or allow SQLite fallback)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const USE_SQLITE = String(process.env.USE_SQLITE || '').toLowerCase() === 'true';

let supabase = null;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  if (USE_SQLITE) {
    console.warn('SUPABASE_URL/KEY not provided — running with SQLite fallback (USE_SQLITE=true)');
    global.supabase = null;
  } else {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
    process.exit(1);
  }
} else {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  global.supabase = supabase; // Make supabase available globally
}

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

// Health check endpoint (keep this for monitoring)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/profile', require('./routes/profile'));

// Serve frontend assets and shared client code for production deployment
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));
app.use(express.static(path.join(__dirname, '..', 'landing-page')));

// basic centralized error handler
app.use((err, req, res, next) => {
  logger.error(err && err.stack ? err.stack : String(err));
  res.status(500).json({ message: 'Internal server error' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'landing-page', 'index.html'));
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
