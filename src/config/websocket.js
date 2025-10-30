const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const initializeWebSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware for WebSocket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach user info to socket
      socket.userId = decoded.id;
      socket.userRole = decoded.role;

      logger.info(`WebSocket authentication successful for user: ${decoded.id}`);
      next();
    } catch (error) {
      logger.error(`WebSocket authentication failed: ${error.message}`);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Handle connection
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id} (User: ${socket.userId})`);

    // Join user to their own room (for personal notifications)
    socket.join(socket.userId);

    // Join admin room if user is admin
    if (socket.userRole === 'admin' || socket.userRole === 'inspector') {
      socket.join('admin');
      logger.info(`User ${socket.userId} joined admin room`);
    }

    // Handle custom events
    socket.on('join_application_room', (applicationId) => {
      socket.join(`application_${applicationId}`);
      logger.info(`User ${socket.userId} joined application room: ${applicationId}`);
    });

    socket.on('leave_application_room', (applicationId) => {
      socket.leave(`application_${applicationId}`);
      logger.info(`User ${socket.userId} left application room: ${applicationId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id} (User: ${socket.userId})`);
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Successfully connected to Fire Department Monitoring System',
      userId: socket.userId
    });
  });

  logger.info('WebSocket server initialized');
  return io;
};

module.exports = initializeWebSocket;