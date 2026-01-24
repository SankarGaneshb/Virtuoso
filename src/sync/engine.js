const { db, getLinkedAccounts, getAllUsersWithLinkedAccounts } = require('../db/database');
const { getAggregator } = require('../aggregators');

const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 Hour

class SyncEngine {
    constructor() {
        this.isRunning = false;
        this.timer = null;
    }

    startScheduler() {
        if (this.isRunning) return;
        console.log('🔄 Sync Engine: Scheduler started.');
        this.isRunning = true;

        // Run immediately on start
        this.runSyncCycle();

        // Then schedule
        this.timer = setInterval(() => this.runSyncCycle(), SYNC_INTERVAL_MS);
    }

    stopScheduler() {
        if (this.timer) clearInterval(this.timer);
        this.isRunning = false;
        console.log('🛑 Sync Engine: Scheduler stopped.');
    }

    async runSyncCycle() {
        console.log('🔄 Sync Engine: Starting sync cycle...');
        try {
            const users = await getAllUsersWithLinkedAccounts();

            for (const user of users) {
                // Skip inactive users
                if (!user.is_active) {
                    console.log(`⏩ Skipping inactive user: ${user.username}`);
                    continue;
                }

                if (user.linked_accounts.length === 0) continue;

                console.log(`📥 Syncing user: ${user.username}...`);
                await this.syncUser(user);
            }
            console.log('✅ Sync Engine: Cycle complete.');
        } catch (error) {
            console.error('❌ Sync Engine Error:', error);
        }
    }

    async syncUser(user) {
        for (const account of user.linked_accounts) {
            const aggregator = getAggregator(account.platform);
            if (!aggregator) {
                console.warn(`⚠️ No aggregator found for platform: ${account.platform}`);
                continue;
            }

            try {
                // Determine identifier (username vs id)
                const identifier = account.platform_username || account.platform_user_id;

                // Fetch live data
                // Note: Real aggregators might need API keys passed here if not global
                const items = await aggregator.fetch(identifier);

                if (Array.isArray(items) && items.length > 0) {
                    await this.cacheContributions(user.id, account.platform, items);
                    // Update user as active
                    this.updateUserActivity(user.id);
                }

            } catch (err) {
                console.error(`❌ Failed to sync ${user.username} on ${account.platform}:`, err.message);
            }
        }
    }

    async cacheContributions(userId, platform, items) {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
                INSERT INTO contributions (user_id, platform, external_id, date, description, url, fetched_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(platform, external_id) DO UPDATE SET
                description = excluded.description,
                url = excluded.url,
                fetched_at = CURRENT_TIMESTAMP
            `);

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                items.forEach(item => {
                    // Generate a deterministic external_id if missing (e.g. from hash)
                    // For now assume item.id exists
                    const extId = item.id || `${platform}-${item.date}-${Math.random()}`;

                    stmt.run(userId, platform, extId, item.date, item.description, item.url || '');
                });
                db.run("COMMIT", (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            stmt.finalize();
        });
    }

    updateUserActivity(userId) {
        db.run("UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?", [userId]);
    }
}

module.exports = new SyncEngine();
