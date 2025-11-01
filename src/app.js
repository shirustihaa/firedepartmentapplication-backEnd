require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const connectDB = require('./config/database');
const setupSwagger = require('./config/swagger');
const initializeWebSocket = require('./config/websocket');
const schedulerService = require('./services/schedulerService');
const notificationService = require('./services/notificationService');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const applicationRoutes = require('./routes/applications');
const nocRoutes = require('./routes/noc');
//const licenseRoutes = require('./routes/licenses');
const reportRoutes = require('./routes/reports');
const inspectionRoutes = require('./routes/inspections');

// Initialize express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Connect to database
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: '*',  // Allow all origins for backend-only setup
  credentials: true
}));
app.use(express.json()); // Body parser
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Setup Swagger documentation
setupSwagger(app);

// Initialize WebSocket
const io = initializeWebSocket(server);
notificationService.setSocketIO(io);

// Initialize scheduler services
schedulerService.initializeScheduler();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/noc', nocRoutes);
//app.use('/api/licenses', licenseRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Fire Department Monitoring System is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Fire Department Monitoring System API',
    documentation: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api-docs`
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;