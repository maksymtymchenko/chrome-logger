// Enhanced server.js with better API endpoints and error handling
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const DepartmentManager = require('./department-manager');
require('dotenv').config();
const app = express();

// Enable CORS for Chrome extension
app.use((req, res, next) => {
    console.log('CORS middleware - Origin:', req.headers.origin, 'Method:', req.method);
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request');
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json({ limit: '5mb' })); // increase limit for screenshots

// MongoDB setup (optional, falls back to file storage if not configured)
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// Session middleware
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true, // Prevent XSS attacks
        sameSite: 'lax' // CSRF protection
    }
};

// Use MongoDB session store if available, otherwise use memory store
if (MONGO_URI) {
    sessionConfig.store = MongoStore.create({
        mongoUrl: MONGO_URI,
        touchAfter: 24 * 3600 // lazy session update
    });
}

app.use(session(sessionConfig));
let useMongo = false;
if (MONGO_URI) {
    mongoose.connect(MONGO_URI, { dbName: process.env.MONGO_DB || 'activity_collector' })
        .then(() => {
            useMongo = true;
            console.log('Connected to MongoDB');
        })
        .catch((err) => {
            useMongo = false;
            console.error('MongoDB connection failed, using file storage fallback:', err.message);
        });
}

// Schemas and Models
let EventModel, ScreenshotModel, UserModel;
if (MONGO_URI) {
    const eventSchema = new mongoose.Schema({
        deviceIdHash: String,
        domain: String,
        durationMs: Number,
        timestamp: Date,
        reason: String,
        username: String,
        type: String,
        data: mongoose.Schema.Types.Mixed
    }, { versionKey: false });
    eventSchema.index({ timestamp: -1 });
    eventSchema.index({ username: 1, timestamp: -1 });
    eventSchema.index({ domain: 1, timestamp: -1 });

    const screenshotSchema = new mongoose.Schema({
        filename: String,
        url: String,
        mtime: Date,
        domain: String,
        username: String,
    }, { versionKey: false });
    screenshotSchema.index({ mtime: -1 });


    const userSchema = new mongoose.Schema({
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ['ADMIN', 'VIEWER'], default: 'VIEWER' },
        createdAt: { type: Date, default: Date.now },
        lastLogin: Date
    }, { versionKey: false });
    userSchema.index({ username: 1 });

    EventModel = mongoose.models.Event || mongoose.model('Event', eventSchema);
    ScreenshotModel = mongoose.models.Screenshot || mongoose.model('Screenshot', screenshotSchema);
    UserModel = mongoose.models.User || mongoose.model('User', userSchema);
}

// Basic auth / token check - REQUIRED in production
const API_TOKEN = process.env.API_TOKEN || 'changeme';

// Simple storage to file (for demo). Replace with proper DB.
const DATA_FILE = path.join(__dirname, 'activity_log.json');
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR);

// Initialize Department Manager
const departmentManager = new DepartmentManager(__dirname);


// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    } else {
        return res.redirect('/login');
    }
};

// Role-based access control middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!req.session.userRole || !roles.includes(req.session.userRole)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};


// Login page
app.get('/login', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'dashboard', 'login.html'));
});

// Login endpoint
app.post('/api/login', async(req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (!useMongo) {
            return res.status(500).json({ error: 'Authentication requires MongoDB connection' });
        }

        const user = await UserModel.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Set session
        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.userRole = user.role;

        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ error: 'Session save failed' });
            }

            res.json({
                success: true,
                user: {
                    username: user.username,
                    role: user.role
                }
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true });
    });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            authenticated: true,
            user: {
                username: req.session.username,
                role: req.session.userRole
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// User management endpoints (Admin only)
app.get('/api/users', requireRole(['ADMIN']), async(req, res) => {
    try {
        if (!useMongo) {
            return res.status(500).json({ error: 'User management requires MongoDB connection' });
        }

        const users = await UserModel.find({}, { password: 0 }).sort({ createdAt: -1 });
        res.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/api/users', requireRole(['ADMIN']), async(req, res) => {
    try {
        const { username, password, role } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (!['ADMIN', 'VIEWER'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be ADMIN or VIEWER' });
        }

        if (!useMongo) {
            return res.status(500).json({ error: 'User management requires MongoDB connection' });
        }

        // Check if user already exists
        const existingUser = await UserModel.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new UserModel({
            username,
            password: hashedPassword,
            role: role || 'VIEWER'
        });

        await user.save();
        res.json({ success: true, user: { username: user.username, role: user.role } });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.delete('/api/users/:id', requireRole(['ADMIN']), async(req, res) => {
    try {
        const { id } = req.params;

        if (!useMongo) {
            return res.status(500).json({ error: 'User management requires MongoDB connection' });
        }

        // Prevent deleting the last admin
        const adminCount = await UserModel.countDocuments({ role: 'ADMIN' });
        const user = await UserModel.findById(id);

        if (user && user.role === 'ADMIN' && adminCount <= 1) {
            return res.status(400).json({ error: 'Cannot delete the last admin user' });
        }

        await UserModel.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Create default admin user if none exists
async function createDefaultAdmin() {
    if (!useMongo) return;

    try {
        const adminExists = await UserModel.findOne({ role: 'ADMIN' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = new UserModel({
                username: 'admin',
                password: hashedPassword,
                role: 'ADMIN'
            });
            await admin.save();
            console.log('Default admin user created: admin/admin123');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
}

// Initialize default admin after MongoDB connection
if (MONGO_URI) {
    mongoose.connection.once('open', () => {
        createDefaultAdmin();
    });
}

// Serve static files for dashboard assets
app.use('/assets', express.static(path.join(__dirname, 'dashboard')));

// Protected dashboard route
app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard', 'index.html'));
});
// Ensure screenshots dir exists before serving static files
app.use('/screenshots', (req, res, next) => {
    try {
        if (!fs.existsSync(SCREENSHOT_DIR)) {
            fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
        }
    } catch (_) {}
    next();
}, express.static(SCREENSHOT_DIR));

app.get('/ping', (req, res) => res.json({ message: 'pong' }));


// Return recent activity events with enhanced filtering
app.get('/api/activity', async(req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 200, 1000);
        const user = req.query.user;
        const domain = req.query.domain;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        if (useMongo) {
            const filter = {};
            if (user) filter.username = user;
            if (domain) filter.domain = domain;
            if (startDate || endDate) filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = startDate;
            if (endDate) filter.timestamp.$lte = endDate;

            const events = await EventModel.find(filter).sort({ timestamp: -1 }).limit(limit).lean();

            // Stats
            const agg = await EventModel.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        totalEvents: { $sum: 1 },
                        totalDuration: { $sum: { $ifNull: ['$durationMs', 0] } },
                        users: { $addToSet: '$username' },
                        domains: { $addToSet: '$domain' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalEvents: 1,
                        totalDuration: 1,
                        uniqueUsers: { $size: '$users' },
                        uniqueDomains: { $size: '$domains' },
                        averageDuration: { $cond: [{ $gt: ['$totalEvents', 0] }, { $divide: ['$totalDuration', '$totalEvents'] }, 0] }
                    }
                }
            ]);
            const stats = agg[0] || { totalEvents: 0, uniqueUsers: 0, uniqueDomains: 0, totalDuration: 0, averageDuration: 0 };

            return res.json({ count: events.length, events, stats });
        }

        // File fallback
        const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        let all = raw;
        if (user) all = all.filter(e => e.username === user);
        if (domain) all = all.filter(e => e.domain === domain);
        if (startDate) all = all.filter(e => new Date(e.timestamp) >= startDate);
        if (endDate) all = all.filter(e => new Date(e.timestamp) <= endDate);
        const recent = all.slice(-limit).reverse();
        const stats = {
            totalEvents: all.length,
            uniqueUsers: new Set(all.map(e => e.username)).size,
            uniqueDomains: new Set(all.map(e => e.domain)).size,
            totalDuration: all.reduce((s, e) => s + (e.durationMs || 0), 0),
            averageDuration: all.length > 0 ? all.reduce((s, e) => s + (e.durationMs || 0), 0) / all.length : 0
        };
        return res.json({ count: recent.length, events: recent, stats });
    } catch (e) {
        console.error('Failed to read activity:', e);
        return res.status(500).json({ error: 'failed to read activity', details: e.message });
    }
});

// List recent screenshots (filenames + URLs)
app.get('/api/screenshots', async(req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const user = req.query.user;
        if (useMongo) {
            const filter = {};
            if (user) {
                const escaped = user.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                filter.$or = [
                    { username: user },
                    { filename: { $regex: new RegExp(`_${escaped}_`) } }
                ];
            }
            const files = await ScreenshotModel.find(filter).sort({ mtime: -1 }).limit(limit).lean();

            // Filter out files that don't actually exist on disk
            const existingFiles = files.filter(file => {
                const filePath = path.join(SCREENSHOT_DIR, file.filename);
                return fs.existsSync(filePath);
            });

            // Get total count of screenshots (not just returned files)
            const totalCount = await ScreenshotModel.countDocuments(filter);

            return res.json({ count: totalCount, files: existingFiles });
        }

        const allFiles = fs.readdirSync(SCREENSHOT_DIR)
            .filter(f => f.toLowerCase().endsWith('.png'))
            .map(f => ({ filename: f, url: `/screenshots/${f}`, mtime: fs.statSync(path.join(SCREENSHOT_DIR, f)).mtimeMs }));

        // Get total count of all screenshots (not filtered by user)
        const totalCount = allFiles.length;

        // Filter by user if specified
        const filteredFiles = allFiles.filter(meta => {
                if (!user) return true;
                try {
                    const base = path.basename(meta.filename, '.png');
                    const parts = base.split('_');
                    // parts: [timestamp, deviceIdHash, username, domain_parts...]
                    return parts.length >= 4 && parts[2] === user;
                } catch (_) { return false; }
            })
            .sort((a, b) => b.mtime - a.mtime)
            .slice(0, limit)
            .map(({ filename, url, mtime }) => ({ filename, url, mtime }));

        return res.json({ count: totalCount, files: filteredFiles });
    } catch (e) {
        console.error('Failed to list screenshots:', e);
        return res.status(500).json({ error: 'failed to list screenshots' });
    }
});

// Delete screenshot endpoint
app.delete('/api/screenshots/:filename', async(req, res) => {
    try {
        const { filename } = req.params;

        if (!filename || !filename.endsWith('.png')) {
            return res.status(400).json({ error: 'Invalid filename' });
        }

        const filePath = path.join(SCREENSHOT_DIR, filename);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Screenshot not found' });
        }

        // Delete file from filesystem
        fs.unlinkSync(filePath);
        console.log(`Deleted screenshot file: ${filename}`);

        // Delete from database if using MongoDB
        if (useMongo) {
            const result = await ScreenshotModel.deleteOne({ filename });
            console.log(`Deleted screenshot record: ${result.deletedCount} record(s)`);
        }

        return res.json({
            success: true,
            message: 'Screenshot deleted successfully',
            filename: filename
        });

    } catch (error) {
        console.error('Error deleting screenshot:', error);
        return res.status(500).json({ error: 'Failed to delete screenshot' });
    }
});

// Bulk delete screenshots endpoint
app.delete('/api/screenshots', async(req, res) => {
    try {
        const { filenames, user } = req.body;

        if (!filenames || !Array.isArray(filenames)) {
            return res.status(400).json({ error: 'Invalid filenames array' });
        }

        let deletedCount = 0;
        const errors = [];

        for (const filename of filenames) {
            try {
                const filePath = path.join(SCREENSHOT_DIR, filename);

                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`Deleted screenshot file: ${filename}`);
                }

                // Delete from database if using MongoDB
                if (useMongo) {
                    await ScreenshotModel.deleteOne({ filename });
                }

            } catch (error) {
                console.error(`Error deleting screenshot ${filename}:`, error);
                errors.push({ filename, error: error.message });
            }
        }

        return res.json({
            success: true,
            message: `Deleted ${deletedCount} screenshot(s)`,
            deletedCount,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Error bulk deleting screenshots:', error);
        return res.status(500).json({ error: 'Failed to delete screenshots' });
    }
});

// Enhanced activity collection endpoint with validation
app.post('/collect-activity', async(req, res) => {
    try {
        console.log('Received collect-activity payload');
        console.log('Payload:', JSON.stringify(req.body, null, 2));
        const payload = req.body;

        if (!payload || !Array.isArray(payload.events)) {
            return res.status(400).json({ error: 'Invalid payload', message: 'Expected payload with events array' });
        }

        const sanitized = payload.events.map((e, index) => {
            if (!e.deviceId || !e.domain) {
                throw new Error(`Event ${index}: Missing required fields (deviceId, domain)`);
            }
            return {
                deviceIdHash: crypto.createHash('sha256').update(String(e.deviceId)).digest('hex').slice(0, 16),
                domain: String(e.domain).toLowerCase().trim(),
                durationMs: Math.max(0, Number(e.durationMs) || 0),
                timestamp: new Date(e.timestamp),
                reason: String(e.reason || 'active').trim(),
                username: String(e.username || 'Unknown').trim(),
                type: e.type || null,
                data: e.data || null
            };
        });

        if (useMongo) {
            await EventModel.insertMany(sanitized, { ordered: false });
        } else {
            const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            const combined = existing.concat(sanitized.map(e => ({...e, timestamp: e.timestamp.toISOString() })));
            fs.writeFileSync(DATA_FILE, JSON.stringify(combined, null, 2), 'utf8');
        }

        console.log(`Stored ${sanitized.length} events`);
        return res.json({ received: sanitized.length, message: 'Events stored successfully', timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('Error processing activity data:', error);
        return res.status(400).json({ error: 'Failed to process activity data', message: error.message });
    }
});

// Collect tracking data (form interactions, content structure, user behavior)
app.post('/collect-tracking', (req, res) => {
    try {
        const { events } = req.body;
        if (!events || !Array.isArray(events)) {
            return res.status(400).json({ error: 'events array required' });
        }

        console.log('Received', events.length, 'tracking events');

        // For now, just log the tracking data
        // In production, you might want to store this in a separate collection
        events.forEach(event => {
            console.log('Tracking event:', event.dataType, {
                username: event.username,
                domain: event.domain,
                timestamp: new Date(event.timestamp).toISOString(),
                data: event.data
            });
        });

        res.json({ success: true, count: events.length });
    } catch (e) {
        console.error('Error storing tracking data:', e);
        res.status(500).json({ error: 'failed to store tracking data' });
    }
});

// Screenshot collection endpoint
app.post('/collect-screenshot', (req, res) => {
    console.log('Received screenshot payload');
    const payload = req.body;
    if (!payload || !payload.deviceId || !payload.domain || !payload.screenshot) return res.status(400).send('bad request');

    const deviceIdHash = crypto.createHash('sha256').update(String(payload.deviceId)).digest('hex').slice(0, 16);
    const username = payload.username || 'Unknown';
    const timestamp = Date.now();
    const filename = `${timestamp}_${deviceIdHash}_${username}_${payload.domain.replace(/[^a-z0-9]/gi,'_')}.png`;
    const filePath = path.join(SCREENSHOT_DIR, filename);

    // Save Base64 PNG to file
    const base64Data = payload.screenshot.replace(/^data:image\/png;base64,/, '');
    fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) {
            console.error('Failed to save screenshot:', err);
            return res.status(500).send('failed to save');
        }
        console.log('Saved screenshot:', filename);
        // Save metadata to DB if enabled
        if (useMongo) {
            ScreenshotModel.create({ filename, url: `/screenshots/${filename}`, mtime: new Date(), domain: payload.domain, username: username });
        }
        return res.json({ saved: filename });
    });
});

// Analytics endpoints
app.get('/api/analytics/summary', async(req, res) => {
    try {
        if (useMongo) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const thisMonth = new Date(today.getFullYear(), now.getMonth(), 1);

            const [totalAgg, todayAgg, weekAgg, monthAgg] = await Promise.all([
                EventModel.aggregate([{ $group: { _id: null, events: { $sum: 1 }, duration: { $sum: { $ifNull: ['$durationMs', 0] } }, users: { $addToSet: '$username' }, domains: { $addToSet: '$domain' } } }, { $project: { _id: 0, events: 1, duration: 1, users: { $size: '$users' }, domains: { $size: '$domains' } } }]),
                EventModel.aggregate([{ $match: { timestamp: { $gte: today } } }, { $group: { _id: null, events: { $sum: 1 }, duration: { $sum: { $ifNull: ['$durationMs', 0] } } } }, { $project: { _id: 0, events: 1, duration: 1 } }]),
                EventModel.aggregate([{ $match: { timestamp: { $gte: thisWeek } } }, { $group: { _id: null, events: { $sum: 1 }, duration: { $sum: { $ifNull: ['$durationMs', 0] } } } }, { $project: { _id: 0, events: 1, duration: 1 } }]),
                EventModel.aggregate([{ $match: { timestamp: { $gte: thisMonth } } }, { $group: { _id: null, events: { $sum: 1 }, duration: { $sum: { $ifNull: ['$durationMs', 0] } } } }, { $project: { _id: 0, events: 1, duration: 1 } }])
            ]);

            const total = totalAgg[0] || { events: 0, users: 0, domains: 0, duration: 0 };
            const todayS = todayAgg[0] || { events: 0, duration: 0 };
            const weekS = weekAgg[0] || { events: 0, duration: 0 };
            const monthS = monthAgg[0] || { events: 0, duration: 0 };
            return res.json({
                total: { events: total.events || 0, users: total.users || 0, domains: total.domains || 0, duration: total.duration || 0 },
                today: { events: todayS.events || 0, duration: todayS.duration || 0 },
                thisWeek: { events: weekS.events || 0, duration: weekS.duration || 0 },
                thisMonth: { events: monthS.events || 0, duration: monthS.duration || 0 }
            });
        }

        const all = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(today.getFullYear(), now.getMonth(), 1);
        const todayEvents = all.filter(e => new Date(e.timestamp) >= today);
        const weekEvents = all.filter(e => new Date(e.timestamp) >= thisWeek);
        const monthEvents = all.filter(e => new Date(e.timestamp) >= thisMonth);
        const summary = {
            total: { events: all.length, users: new Set(all.map(e => e.username)).size, domains: new Set(all.map(e => e.domain)).size, duration: all.reduce((sum, e) => sum + (e.durationMs || 0), 0) },
            today: { events: todayEvents.length, duration: todayEvents.reduce((sum, e) => sum + (e.durationMs || 0), 0) },
            thisWeek: { events: weekEvents.length, duration: weekEvents.reduce((sum, e) => sum + (e.durationMs || 0), 0) },
            thisMonth: { events: monthEvents.length, duration: monthEvents.reduce((sum, e) => sum + (e.durationMs || 0), 0) }
        };
        res.json(summary);
    } catch (error) {
        console.error('Error generating analytics summary:', error);
        res.status(500).json({ error: 'Failed to generate analytics summary' });
    }
});

// Top domains endpoint
app.get('/api/analytics/top-domains', async(req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 10, 50);
        if (useMongo) {
            const agg = await EventModel.aggregate([
                { $group: { _id: '$domain', totalTime: { $sum: { $ifNull: ['$durationMs', 0] } }, visitCount: { $sum: 1 }, lastVisit: { $max: '$timestamp' } } },
                { $sort: { totalTime: -1 } },
                { $limit: limit }
            ]);
            const domains = agg.map(d => ({ domain: d._id, totalTime: d.totalTime, visitCount: d.visitCount, lastVisit: d.lastVisit, totalTimeMinutes: Math.round(d.totalTime / 60000), averageTimeMinutes: Math.round(d.totalTime / d.visitCount / 60000) }));
            return res.json({ domains });
        }

        const all = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        const domainStats = {};
        all.forEach(event => {
            if (!domainStats[event.domain]) domainStats[event.domain] = { domain: event.domain, totalTime: 0, visitCount: 0, lastVisit: event.timestamp };
            domainStats[event.domain].totalTime += event.durationMs || 0;
            domainStats[event.domain].visitCount += 1;
            if (new Date(event.timestamp) > new Date(domainStats[event.domain].lastVisit)) domainStats[event.domain].lastVisit = event.timestamp;
        });
        const topDomains = Object.values(domainStats).sort((a, b) => b.totalTime - a.totalTime).slice(0, limit).map(stat => ({...stat, totalTimeMinutes: Math.round(stat.totalTime / 60000), averageTimeMinutes: Math.round(stat.totalTime / stat.visitCount / 60000) }));
        res.json({ domains: topDomains });
    } catch (error) {
        console.error('Error getting top domains:', error);
        res.status(500).json({ error: 'Failed to get top domains' });
    }
});

// User activity endpoint
app.get('/api/analytics/users', async(req, res) => {
    try {
        if (useMongo) {
            const agg = await EventModel.aggregate([
                { $group: { _id: '$username', totalTime: { $sum: { $ifNull: ['$durationMs', 0] } }, eventCount: { $sum: 1 }, domains: { $addToSet: '$domain' }, lastActivity: { $max: '$timestamp' } } },
                { $project: { _id: 0, username: '$_id', totalTime: 1, eventCount: 1, uniqueDomains: { $size: '$domains' }, domains: '$domains', lastActivity: 1, totalTimeMinutes: { $round: [{ $divide: ['$totalTime', 60000] }, 0] } } },
                { $sort: { totalTime: -1 } }
            ]);
            return res.json({ users: agg });
        }

        const all = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        const userStats = {};
        all.forEach(event => {
            if (!userStats[event.username]) userStats[event.username] = { username: event.username, totalTime: 0, eventCount: 0, domains: new Set(), lastActivity: event.timestamp };
            userStats[event.username].totalTime += event.durationMs || 0;
            userStats[event.username].eventCount += 1;
            userStats[event.username].domains.add(event.domain);
            if (new Date(event.timestamp) > new Date(userStats[event.username].lastActivity)) userStats[event.username].lastActivity = event.timestamp;
        });
        const users = Object.values(userStats).map(stat => ({...stat, totalTimeMinutes: Math.round(stat.totalTime / 60000), uniqueDomains: stat.domains.size, domains: Array.from(stat.domains) }));
        res.json({ users });
    } catch (error) {
        console.error('Error getting user analytics:', error);
        res.status(500).json({ error: 'Failed to get user analytics' });
    }
});

// Productivity Insights endpoints
// Admin endpoint to delete user data
app.delete('/api/admin/delete-user/:username', requireRole(['ADMIN']), async(req, res) => {
    try {
        const { username } = req.params;

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Delete all activity logs for the user
        const activityResult = await EventModel.deleteMany({ username });

        // Delete all screenshots for the user (both files and database records)
        const screenshotsDir = path.join(__dirname, 'screenshots');
        const screenshotFiles = fs.readdirSync(screenshotsDir).filter(file =>
            file.includes(username) && file.endsWith('.png')
        );

        let deletedScreenshots = 0;
        for (const file of screenshotFiles) {
            try {
                fs.unlinkSync(path.join(screenshotsDir, file));
                deletedScreenshots++;
            } catch (err) {
                console.error(`Error deleting screenshot ${file}:`, err);
            }
        }

        // Also delete screenshot records from database
        const screenshotResult = await ScreenshotModel.deleteMany({ username });

        res.json({
            success: true,
            message: `Successfully deleted data for user ${username}`,
            deleted: {
                activityLogs: activityResult.deletedCount,
                screenshots: deletedScreenshots,
                screenshotRecords: screenshotResult.deletedCount
            }
        });

    } catch (error) {
        console.error('Error deleting user data:', error);
        res.status(500).json({ error: 'Failed to delete user data' });
    }
});


app.get('/api/analytics/productivity/:username', async(req, res) => {
    try {
        const { username } = req.params;
        const { period = 'week', startDate, endDate } = req.query;

        let dateFilter = {};
        const now = new Date();

        if (startDate && endDate) {
            dateFilter = {
                timestamp: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        } else {
            // Default period filtering
            switch (period) {
                case 'day':
                    const startOfDay = new Date(now);
                    startOfDay.setHours(0, 0, 0, 0);
                    dateFilter = { timestamp: { $gte: startOfDay } };
                    break;
                case 'week':
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - 7);
                    dateFilter = { timestamp: { $gte: startOfWeek } };
                    break;
                case 'month':
                    const startOfMonth = new Date(now);
                    startOfMonth.setDate(now.getDate() - 30);
                    dateFilter = { timestamp: { $gte: startOfMonth } };
                    break;
            }
        }

        if (useMongo) {
            const userFilter = { username, ...dateFilter };

            // Get all events for the user in the specified period
            const events = await EventModel.find(userFilter).sort({ timestamp: 1 }).lean();

            // Calculate productivity insights
            const insights = calculateProductivityInsights(events);

            res.json(insights);
        } else {
            const all = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            const userEvents = all.filter(event => {
                if (event.username !== username) return false;
                const eventDate = new Date(event.timestamp);
                if (startDate && eventDate < new Date(startDate)) return false;
                if (endDate && eventDate > new Date(endDate)) return false;
                if (!startDate && !endDate) {
                    const now = new Date();
                    switch (period) {
                        case 'day':
                            const startOfDay = new Date(now);
                            startOfDay.setHours(0, 0, 0, 0);
                            if (eventDate < startOfDay) return false;
                            break;
                        case 'week':
                            const startOfWeek = new Date(now);
                            startOfWeek.setDate(now.getDate() - 7);
                            if (eventDate < startOfWeek) return false;
                            break;
                        case 'month':
                            const startOfMonth = new Date(now);
                            startOfMonth.setDate(now.getDate() - 30);
                            if (eventDate < startOfMonth) return false;
                            break;
                    }
                }
                return true;
            });

            const insights = calculateProductivityInsights(userEvents);
            res.json(insights);
        }
    } catch (error) {
        console.error('Error getting productivity insights:', error);
        res.status(500).json({ error: 'Failed to get productivity insights' });
    }
});

// Helper function to calculate productivity insights

function calculateProductivityInsights(events) {
    if (!events || events.length === 0) {
        return {
            focusTime: 0,
            totalTime: 0,
            productivityScore: 0,
            distractionCount: 0,
            averageSessionLength: 0,
            workDomains: [],
            personalDomains: [],
            focusPatterns: [],
            recommendations: []
        };
    }

    // Define work and personal domain patterns
    const workPatterns = [
        /github\.com/i, /stackoverflow\.com/i, /dev\.to/i, /medium\.com/i,
        /docs\./i, /api\./i, /admin\./i, /dashboard\./i, /app\./i,
        /slack\.com/i, /teams\.microsoft\.com/i, /zoom\.us/i,
        /google\.com\/docs/i, /google\.com\/sheets/i, /google\.com\/slides/i,
        /notion\.so/i, /trello\.com/i, /asana\.com/i, /jira\./i,
        /localhost/i, /127\.0\.0\.1/i, /ngrok\./i
    ];

    const personalPatterns = [
        /facebook\.com/i, /instagram\.com/i, /twitter\.com/i, /tiktok\.com/i,
        /youtube\.com/i, /netflix\.com/i, /reddit\.com/i, /pinterest\.com/i,
        /amazon\.com/i, /ebay\.com/i, /shopping/i, /news\./i,
        /gmail\.com/i, /outlook\.com/i, /yahoo\.com/i
    ];

    // Categorize domains
    const workDomains = new Set();
    const personalDomains = new Set();
    const neutralDomains = new Set();

    events.forEach(event => {
        const domain = event.domain.toLowerCase();
        let categorized = false;

        for (const pattern of workPatterns) {
            if (pattern.test(domain)) {
                workDomains.add(domain);
                categorized = true;
                break;
            }
        }

        if (!categorized) {
            for (const pattern of personalPatterns) {
                if (pattern.test(domain)) {
                    personalDomains.add(domain);
                    categorized = true;
                    break;
                }
            }
        }

        if (!categorized) {
            neutralDomains.add(domain);
        }
    });

    // Calculate time spent in each category
    let workTime = 0;
    let personalTime = 0;
    let neutralTime = 0;

    events.forEach(event => {
        const domain = event.domain.toLowerCase();
        const duration = event.durationMs || 0;

        if (workDomains.has(domain)) {
            workTime += duration;
        } else if (personalDomains.has(domain)) {
            personalTime += duration;
        } else {
            neutralTime += duration;
        }
    });

    const totalTime = workTime + personalTime + neutralTime;
    const focusTime = workTime; // Focus time is time spent on work domains

    // Calculate productivity score (0-100)
    let productivityScore = 0;
    if (totalTime > 0) {
        const workRatio = workTime / totalTime;
        const personalRatio = personalTime / totalTime;

        // Base score from work ratio
        productivityScore = workRatio * 70;

        // Bonus for high work ratio
        if (workRatio > 0.8) productivityScore += 20;
        else if (workRatio > 0.6) productivityScore += 10;

        // Penalty for high personal ratio
        if (personalRatio > 0.3) productivityScore -= 20;
        else if (personalRatio > 0.2) productivityScore -= 10;

        // Ensure score is between 0 and 100
        productivityScore = Math.max(0, Math.min(100, productivityScore));
    }

    // Calculate distraction count (switches to personal domains)
    let distractionCount = 0;
    let currentCategory = null;

    events.forEach(event => {
        const domain = event.domain.toLowerCase();
        let category = 'neutral';

        if (workDomains.has(domain)) category = 'work';
        else if (personalDomains.has(domain)) category = 'personal';

        if (currentCategory === 'work' && category === 'personal') {
            distractionCount++;
        }
        currentCategory = category;
    });

    // Calculate average session length
    const averageSessionLength = events.length > 0 ? totalTime / events.length : 0;

    // Generate focus patterns (hourly breakdown)
    const hourlyFocus = {};
    events.forEach(event => {
        const hour = new Date(event.timestamp).getHours();
        if (!hourlyFocus[hour]) hourlyFocus[hour] = { work: 0, personal: 0, total: 0 };

        const domain = event.domain.toLowerCase();
        const duration = event.durationMs || 0;

        hourlyFocus[hour].total += duration;
        if (workDomains.has(domain)) {
            hourlyFocus[hour].work += duration;
        } else if (personalDomains.has(domain)) {
            hourlyFocus[hour].personal += duration;
        }
    });

    const focusPatterns = Object.keys(hourlyFocus).map(hour => ({
        hour: parseInt(hour),
        workTime: Math.round(hourlyFocus[hour].work / 60000),
        personalTime: Math.round(hourlyFocus[hour].personal / 60000),
        totalTime: Math.round(hourlyFocus[hour].total / 60000),
        focusRatio: hourlyFocus[hour].total > 0 ? hourlyFocus[hour].work / hourlyFocus[hour].total : 0
    })).sort((a, b) => a.hour - b.hour);

    // Generate recommendations
    const recommendations = [];

    if (productivityScore < 50) {
        recommendations.push("Consider reducing time spent on personal websites during work hours");
    }

    if (distractionCount > 10) {
        recommendations.push("High number of distractions detected. Try using focus mode or website blockers");
    }

    if (workTime < 4 * 60 * 60 * 1000) { // Less than 4 hours
        recommendations.push("Consider increasing focus time for better productivity");
    }

    const peakFocusHour = focusPatterns.reduce((max, pattern) =>
        pattern.focusRatio > max.focusRatio ? pattern : max, { hour: 0, focusRatio: 0 }
    );

    if (peakFocusHour.focusRatio > 0.8) {
        recommendations.push(`Your most productive hour is ${peakFocusHour.hour}:00. Schedule important tasks during this time`);
    }

    return {
        focusTime: Math.round(focusTime / 60000), // Convert to minutes
        totalTime: Math.round(totalTime / 60000), // Convert to minutes
        productivityScore: Math.round(productivityScore),
        distractionCount,
        averageSessionLength: Math.round(averageSessionLength / 60000), // Convert to minutes
        workDomains: Array.from(workDomains),
        personalDomains: Array.from(personalDomains),
        neutralDomains: Array.from(neutralDomains),
        focusPatterns,
        recommendations,
        workTimeRatio: totalTime > 0 ? Math.round((workTime / totalTime) * 100) : 0,
        personalTimeRatio: totalTime > 0 ? Math.round((personalTime / totalTime) * 100) : 0
    };
}

// Department Management API endpoints
// Get all departments
app.get('/api/departments', async(req, res) => {
    try {
        const departments = departmentManager.getAllDepartments();
        res.json(departments);
    } catch (error) {
        console.error('Error getting departments:', error);
        res.status(500).json({ error: 'Failed to get departments' });
    }
});

// Create department
app.post('/api/departments', requireRole(['ADMIN']), async(req, res) => {
    try {
        const { id, name, color, description } = req.body;
        const department = departmentManager.createDepartment(id, name, color, description);
        res.json(department);
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ error: 'Failed to create department' });
    }
});

// Update department
app.put('/api/departments/:id', requireRole(['ADMIN']), async(req, res) => {
    try {
        const { id } = req.params;
        const { updates } = req.body;
        const department = departmentManager.updateDepartment(id, updates);
        if (department) {
            res.json(department);
        } else {
            res.status(404).json({ error: 'Department not found' });
        }
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ error: 'Failed to update department' });
    }
});

// Delete department
app.delete('/api/departments/:id', requireRole(['ADMIN']), async(req, res) => {
    try {
        const { id } = req.params;
        const result = departmentManager.deleteDepartment(id);
        if (result) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Department not found' });
        }
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ error: 'Failed to delete department' });
    }
});

// Get user departments
app.get('/api/user-departments', async(req, res) => {
    try {
        const userDepartments = {};
        for (const [username, deptId] of departmentManager.userDepartments) {
            userDepartments[username] = deptId;
        }
        res.json(userDepartments);
    } catch (error) {
        console.error('Error getting user departments:', error);
        res.status(500).json({ error: 'Failed to get user departments' });
    }
});

// Assign user to department
app.post('/api/user-departments', requireRole(['ADMIN']), async(req, res) => {
    try {
        const { username, departmentId } = req.body;
        const result = departmentManager.assignUserToDepartment(username, departmentId);
        res.json(result);
    } catch (error) {
        console.error('Error assigning user to department:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get users in department
app.get('/api/departments/:id/users', async(req, res) => {
    try {
        const { id } = req.params;
        const users = departmentManager.getUsersInDepartment(id);
        res.json(users);
    } catch (error) {
        console.error('Error getting department users:', error);
        res.status(500).json({ error: 'Failed to get department users' });
    }
});

// Filter users by department
app.post('/api/departments/filter-users', async(req, res) => {
    try {
        const { users, departmentId } = req.body;
        const filteredUsers = departmentManager.filterUsersByDepartment(users, departmentId);
        res.json(filteredUsers);
    } catch (error) {
        console.error('Error filtering users by department:', error);
        res.status(500).json({ error: 'Failed to filter users' });
    }
});

// Group users by department
app.post('/api/departments/group-users', async(req, res) => {
    try {
        const { users } = req.body;
        const grouped = departmentManager.groupUsersByDepartment(users);
        res.json(grouped);
    } catch (error) {
        console.error('Error grouping users by department:', error);
        res.status(500).json({ error: 'Failed to group users' });
    }
});

// Get department statistics
app.get('/api/departments/:id/stats', async(req, res) => {
    try {
        const { id } = req.params;
        const stats = departmentManager.getDepartmentStatistics(id);
        res.json(stats);
    } catch (error) {
        console.error('Error getting department stats:', error);
        res.status(500).json({ error: 'Failed to get department statistics' });
    }
});

// Search departments
app.get('/api/departments/search', async(req, res) => {
    try {
        const { q } = req.query;
        const results = departmentManager.searchDepartments(q);
        res.json(results);
    } catch (error) {
        console.error('Error searching departments:', error);
        res.status(500).json({ error: 'Failed to search departments' });
    }
});

// Export departments
app.get('/api/departments/export', async(req, res) => {
    try {
        const data = departmentManager.exportDepartments();
        res.json(data);
    } catch (error) {
        console.error('Error exporting departments:', error);
        res.status(500).json({ error: 'Failed to export departments' });
    }
});

// Import departments
app.post('/api/departments/import', requireRole(['ADMIN']), async(req, res) => {
    try {
        const { data } = req.body;
        const result = departmentManager.importDepartments(data);
        res.json(result);
    } catch (error) {
        console.error('Error importing departments:', error);
        res.status(500).json({ error: 'Failed to import departments' });
    }
});

// Export endpoints
app.get('/api/export/csv', (req, res) => {
    try {
        const all = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

        const headers = ['Timestamp', 'User', 'Device ID', 'Domain', 'Duration (seconds)', 'Reason'];
        const rows = all.map(event => [
            new Date(event.timestamp).toISOString(),
            event.username || 'Unknown',
            event.deviceIdHash || 'N/A',
            event.domain,
            Math.round((event.durationMs || 0) / 1000),
            event.reason || 'Active'
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="activity-export-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
    } catch (error) {
        console.error('Error exporting CSV:', error);
        res.status(500).json({ error: 'Failed to export CSV' });
    }
});

app.get('/api/export/json', (req, res) => {
    try {
        const all = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

        const exportData = {
            exportDate: new Date().toISOString(),
            totalEvents: all.length,
            events: all
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="activity-export-${new Date().toISOString().split('T')[0]}.json"`);
        res.json(exportData);
    } catch (error) {
        console.error('Error exporting JSON:', error);
        res.status(500).json({ error: 'Failed to export JSON' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    try {
        const stats = fs.statSync(DATA_FILE);
        const screenshotCount = fs.readdirSync(SCREENSHOT_DIR).length;

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            dataFile: {
                exists: true,
                size: stats.size,
                lastModified: stats.mtime
            },
            screenshots: {
                count: screenshotCount,
                directory: SCREENSHOT_DIR
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString()
    });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`🚀 Enhanced Activity Collector Server running on port ${port}`);
    console.log(`📊 Dashboard: http://localhost:${port}/dashboard`);
    console.log(`🔍 Health Check: http://localhost:${port}/api/health`);
});