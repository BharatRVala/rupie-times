// server.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

// Function to load models
const loadModels = async () => {
    try {
        // Load Mongoose models for cron job
        // NOTE: In CommonJS server, importing ESM models can be tricky. 
        // Using simple import() works in newer Node versions for ESM integration.
        // await import('./src/app/lib/models/Subscription.js');
        // await import('./src/app/lib/models/Notification.js');
        // await import('./src/app/lib/models/User.js');
        // await import('./src/app/lib/models/product.js');
        // await import('./src/app/lib/models/Admin.js');
        console.log('⚠️ Cron Job Models skipped to avoid ESM/CJS conflict');

        return true;
    } catch (error) {
        console.error('❌ Error loading models:', error.message);
        if (error.code === 'ERR_MODULE_NOT_FOUND') {
            console.error('   Please ensure model paths are correct relative to server.js');
        }
        return false;
    }
};

// Start enhanced cron job
const startEnhancedCronJob = async () => {
    const updateSubscriptionStatuses = async () => {
        try {
            // Skipping cron job execution logic for now
            return;

            /* 
            const MONGODB_URI = process.env.MONGODB_URI;

            if (!MONGODB_URI) {
                console.error('MONGODB_URI not found in environment');
                return;
            }

            // Connect to MongoDB if not already connected
            if (mongoose.connection.readyState !== 1) {
                await mongoose.connect(MONGODB_URI, {
                    maxPoolSize: 10,
                    socketTimeoutMS: 30000,
                    connectTimeoutMS: 30000,
                });
            }

            // Load models before using them
            const modelsLoaded = await loadModels();
            if (!modelsLoaded) {
                console.warn('⚠️ Models failed to load, skipping cron cycle');
                return;
            }

            // Import the server-compatible SubscriptionNotifier
            // Using destructuring as we expect { SubscriptionNotifier }
            const { SubscriptionNotifier } = await import('./src/app/lib/utils/subscriptionNotifierServer.js');
            
            // Run the enhanced subscription check
            // 'cron' trigger
            if (SubscriptionNotifier && typeof SubscriptionNotifier.checkAndUpdateAllSubscriptions === 'function') {
                const result = await SubscriptionNotifier.checkAndUpdateAllSubscriptions('cron');
                if (!result.success) {
                    console.error('Cron job internal check failed:', result.error);
                }
            } else {
                console.error('❌ SubscriptionNotifier not correctly imported');
            }
            */
        } catch (error) {
            console.error('Cron Job Fatal Error:', error.message);
            console.error(error.stack);
        }
    };

    // Run immediately on server start
    // console.log('🔄 Initializing Cron Job...');
    await updateSubscriptionStatuses();

    // Run every 30 seconds (can adjust frequency)
    const interval = setInterval(updateSubscriptionStatuses, 30 * 1000);

    // Return cleanup function
    return () => {
        clearInterval(interval);
    };
};

// Start the enhanced cron job
let cleanupCron;

app.prepare().then(async () => {
    // Start cron job after app is prepared
    cleanupCron = await startEnhancedCronJob();

    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    // Socket.IO for Real-time Support Chat
    const { Server } = require('socket.io');
    const io = new Server(httpServer, {
        cors: {
            origin: "*", // Adjust in production
            methods: ["GET", "POST"]
        }
    });
    global.io = io;

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('join_ticket', (ticketId) => {
            socket.join(`ticket-${ticketId}`);
            console.log(`Socket ${socket.id} joined ticket-${ticketId}`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    httpServer.listen(port, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://${hostname}:${port}`);
    });

    // Handle server shutdown
    process.on('SIGTERM', () => {
        if (cleanupCron) cleanupCron();
        httpServer.close();
    });

    process.on('SIGINT', () => {
        if (cleanupCron) cleanupCron();
        httpServer.close();
        process.exit(0);
    });
});
