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
            console.log("Seeding test users...");

            const users = [
                { username: 'testuser', active: 1, platforms: ['GitHub', 'Discord', 'Reddit', 'YouTube'] },
                { username: 'gh_dev', active: 1, platforms: ['GitHub'] },
                { username: 'discord_mod', active: 1, platforms: ['Discord'] },
                { username: 'inactive_guy', active: 0, platforms: ['GitHub', 'Reddit'] }
            ];

            users.forEach(u => {
                db.run("INSERT INTO users (username, is_active) VALUES (?, ?)", [u.username, u.active], function (err) {
                    if (!err) {
                        const userId = this.lastID;
                        u.platforms.forEach(p => {
                            db.run("INSERT INTO linked_accounts (user_id, platform, platform_user_id, platform_username, last_synced_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
                                [userId, p, `${u.username}_${p}`, `${u.username}_${p.toLowerCase()}`]);
                        });
                    }
                });
            });
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

function getAllUsersWithLinkedAccounts() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT u.id, u.username, u.created_at, u.is_active, l.platform, l.platform_username, l.platform_user_id
            FROM users u
            LEFT JOIN linked_accounts l ON u.id = l.user_id
            ORDER BY u.created_at DESC
        `;
        db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else {
                // Group the flat join results by user_id
                const usersMap = {};
                rows.forEach(row => {
                    if (!usersMap[row.id]) {
                        usersMap[row.id] = {
                            id: row.id,
                            username: row.username,
                            created_at: row.created_at,
                            is_active: row.is_active,
                            linked_accounts: []
                        };
                    }
                    if (row.platform) {
                        usersMap[row.id].linked_accounts.push({
                            platform: row.platform,
                            platform_username: row.platform_username,
                            platform_user_id: row.platform_user_id
                        });
                    }
                });
                resolve(Object.values(usersMap));
            }
        });
    });
}

function updateUserStatus(userId, isActive) {
    return new Promise((resolve, reject) => {
        db.run("UPDATE users SET is_active = ? WHERE id = ?", [isActive ? 1 : 0, userId], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

function deleteUser(userId) {
    return new Promise((resolve, reject) => {
        // Cascade delete using a transaction
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            // Delete related data first
            db.run("DELETE FROM linked_accounts WHERE user_id = ?", [userId]);
            db.run("DELETE FROM badges WHERE user_id = ?", [userId]);
            db.run("DELETE FROM manual_contributions WHERE user_id = ?", [userId]);
            db.run("DELETE FROM contributions WHERE user_id = ?", [userId]);
            
            // Delete user
            db.run("DELETE FROM users WHERE id = ?", [userId], function(err) {
                if (err) {
                    db.run("ROLLBACK");
                    reject(err);
                } else {
                    db.run("COMMIT");
                    resolve(this.changes);
                }
            });
        });
    });
}

module.exports = { 
    db, 
    getUser, 
    getLinkedAccounts, 
    linkAccount, 
    addManualContribution, 
    getManualContributions, 
    getAllUsersWithLinkedAccounts,
    updateUserStatus,
    deleteUser
};
