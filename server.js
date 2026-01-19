require('dotenv').config();
const express = require('express');
const path = require('path');
const { getAggregators } = require('./src/aggregators');
// const { fetchGithubContributions } = require('./src/aggregators/github'); // REMOVED
// const { fetchDiscordActivity } = require('./src/aggregators/discord_bot'); // REMOVED
// const { fetchDiscourseActivity } = require('./src/aggregators/discourse'); // REMOVED
const { fetchMiscContributions } = require('./src/aggregators/misc');
const { awardBadges } = require('./src/badges/engine');
const { getUser, getLinkedAccounts, linkAccount, addManualContribution, getManualContributions } = require('./src/db/database');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Enable JSON body parsing
app.use(express.static(path.join(__dirname, 'public')));

// Link Account API
app.post('/api/user/:id/link', async (req, res) => {
    try {
        const userId = req.params.id;
        const { platform, platformUserId, platformUsername } = req.body;

        await linkAccount(userId, platform, platformUserId, platformUsername);
        res.json({ success: true });
    } catch (error) {
        console.error("Link Error:", error);
        res.status(500).json({ error: "Failed to link account" });
    }
});

// Manual Submission API
app.post('/api/contributor/:id/submit', async (req, res) => {
    try {
        const userId = req.params.id;
        const { title, url, description, category } = req.body;

        await addManualContribution(userId, title, url, description, category);
        res.json({ success: true });
    } catch (error) {
        console.error("Submission Error:", error);
        res.status(500).json({ error: "Failed to submit contribution" });
    }
});

// Get Contributor Data
app.get('/api/contributor/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // 1. Get User & Linked Accounts from DB
        const user = await getUser(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const linkedAccounts = await getLinkedAccounts(userId);
        const manualItems = await getManualContributions(userId);

        // 2. Fetch data based on linked accounts
        const promises = [];

        // Use Real Manual Items instead of Mock Misc for "Publications" if any exist, 
        // OR combine them. Let's combine for now so we don't lose the mock demo feel if empty.
        // But for "Publication" badge, we want to rely on this.

        const manualContributions = await getManualContributions(userId);

        const aggregatorPromises = [];
        const TIMEOUT_MS = 5000;

        const safeFetch = async (aggregator, identifier) => {
            try {
                const fetchPromise = aggregator.fetch(identifier);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timed out')), TIMEOUT_MS)
                );

                const results = await Promise.race([fetchPromise, timeoutPromise]);

                if (!Array.isArray(results)) {
                    console.error(`Warning: ${aggregator.name} returned non-array data.`);
                    return [];
                }

                // Basic Schema Validation
                return results.filter(item => {
                    if (!item.id || !item.date || !item.description) {
                        console.warn(`Skipping invalid item from ${aggregator.name}:`, item);
                        return false;
                    }
                    return true;
                });

            } catch (error) {
                console.error(`Error in ${aggregator.name}:`, error.message);
                return []; // Return empty on failure to keep system alive
            }
        };

        // Dynamic Aggregation Loop
        const registeredAggregators = getAggregators();

        registeredAggregators.forEach(aggregator => {
            // Find linked account for this platform
            // We compare case-insensitive or strict depending on convention. Ideally strict 'GitHub' === 'GitHub'
            const account = linkedAccounts.find(a => a.platform === aggregator.platform);

            if (account) {
                // Determine which ID to pass. GitHub/Discourse use 'username', Discord uses 'id'.
                // We stored both in DB. Let's pass the one that exists.
                // Ideally we Standardize DB to just have 'identifier'.
                // For now:
                const identifier = account.platform_username || account.platform_user_id;
                console.log(`Fetching ${aggregator.name} for ${identifier}`);
                aggregatorPromises.push(safeFetch(aggregator, identifier));
            }
        });

        const aggregatedResults = await Promise.all(aggregatorPromises);

        // Flatten array of arrays
        const platformContributions = aggregatedResults.flat();

        const formattedManual = manualContributions.map(c => ({
            id: `manual-${c.id}`,
            platform: 'Publication', // Or 'Manual'
            type: c.category,
            description: c.title,
            date: c.created_at.split('T')[0], // Assuming created_at is a timestamp
            url: c.url,
            status: 'verified'
        }));

        const allContributions = [...platformContributions, ...formattedManual].sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );

        const badges = awardBadges(allContributions);

        // Determine display name: prefer GitHub handle if linked, else DB username
        const githubLink = linkedAccounts.find(a => a.platform === 'GitHub');
        const displayName = githubLink ? githubLink.platform_username : user.username;

        res.json({
            id: user.id,
            name: displayName,
            contributions: allContributions,
            badges: badges,
            linkedAccounts: linkedAccounts
        });
    } catch (error) {
        console.error("Error aggregating data:", error);
        res.status(500).json({ error: "Failed to fetch contributor data" });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
