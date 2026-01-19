const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'community.db');
const schemaPath = path.resolve(__dirname, 'schema.sql');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error executing schema:', err.message);
        } else {
            console.log('Database initialized.');
            // Seed a test user if empty
            seedData();
        }
    });
}

function seedData() {
    db.get("SELECT count(*) as count FROM users", (err, row) => {
        if (row && row.count === 0) {
            console.log("Seeding test user...");
            db.run("INSERT INTO users (username) VALUES ('testuser')");
        }
    });
}

// Helpers
function getUser(id) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getLinkedAccounts(userId) {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM linked_accounts WHERE user_id = ?", [userId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function linkAccount(userId, platform, platformUserId, platformUsername) {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO linked_accounts (user_id, platform, platform_user_id, platform_username, last_synced_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, platform) DO UPDATE SET
            platform_user_id = excluded.platform_user_id,
            platform_username = excluded.platform_username,
            last_synced_at = CURRENT_TIMESTAMP
        `, [userId, platform, platformUserId, platformUsername], function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

function addManualContribution(userId, title, url, description, category) {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO manual_contributions (user_id, title, url, description, category)
            VALUES (?, ?, ?, ?, ?)
        `, [userId, title, url, description, category], function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

function getManualContributions(userId) {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM manual_contributions WHERE user_id = ? ORDER BY created_at DESC", [userId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

module.exports = { db, getUser, getLinkedAccounts, linkAccount, addManualContribution, getManualContributions };
