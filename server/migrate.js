// migrate.js - one-time import from JSON/filesystem to MongoDB
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    const DB_NAME = process.env.MONGO_DB || 'activity_collector';
    if (!MONGO_URI) {
        console.error('Missing MONGO_URI. Create server/.env with MONGO_URI and optional MONGO_DB.');
        process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    console.log('Connected');

    const eventSchema = new mongoose.Schema({
        deviceIdHash: String,
        domain: String,
        durationMs: Number,
        timestamp: Date,
        reason: String,
        username: String
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

    const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
    const Screenshot = mongoose.models.Screenshot || mongoose.model('Screenshot', screenshotSchema);

    // Paths
    const DATA_FILE = path.join(__dirname, 'activity_log.json');
    const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

    // Import activity_log.json
    if (fs.existsSync(DATA_FILE)) {
        try {
            console.log('Reading', DATA_FILE);
            const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            if (Array.isArray(raw) && raw.length > 0) {
                // Normalize records
                const docs = raw.map(e => ({
                    deviceIdHash: e.deviceIdHash || hashDeviceId(e.deviceId),
                    domain: String(e.domain || '').toLowerCase().trim(),
                    durationMs: Number(e.durationMs) || 0,
                    timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
                    reason: String(e.reason || 'active').trim(),
                    username: String(e.username || 'Unknown').trim()
                }));

                console.log('Inserting events:', docs.length);
                await Event.insertMany(docs, { ordered: false });
                console.log('Events import complete');
            } else {
                console.log('No events to import');
            }
        } catch (e) {
            console.error('Failed to import events:', e.message);
        }
    } else {
        console.log('No activity_log.json found, skipping event import');
    }

    // Import screenshots metadata
    if (fs.existsSync(SCREENSHOT_DIR)) {
        try {
            const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.toLowerCase().endsWith('.png'));
            if (files.length) {
                console.log('Importing screenshot metadata:', files.length);
                const docs = files.map(f => {
                    const stat = fs.statSync(path.join(SCREENSHOT_DIR, f));
                    // Try to parse username and domain from filename if present
                    // Format from server: `${timestamp}_${deviceIdHash}_${username}_${domain}.png`
                    let username = undefined;
                    let domain = undefined;
                    try {
                        const base = path.basename(f, '.png');
                        const parts = base.split('_');
                        if (parts.length >= 4) {
                            username = parts[2];
                            domain = parts.slice(3).join('_');
                        }
                    } catch (_) {}
                    return {
                        filename: f,
                        url: `/screenshots/${f}`,
                        mtime: new Date(stat.mtimeMs),
                        username,
                        domain
                    };
                });
                await Screenshot.insertMany(docs, { ordered: false });
                console.log('Screenshots import complete');
            } else {
                console.log('No screenshots found to import');
            }
        } catch (e) {
            console.error('Failed to import screenshots:', e.message);
        }
    } else {
        console.log('No screenshots directory found, skipping screenshot import');
    }

    await mongoose.disconnect();
    console.log('Migration done.');
}

function hashDeviceId(deviceId) {
    if (!deviceId) return undefined;
    try {
        return crypto.createHash('sha256').update(String(deviceId)).digest('hex').slice(0, 16);
    } catch (_) {
        return undefined;
    }
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});