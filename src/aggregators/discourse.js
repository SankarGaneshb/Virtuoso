const axios = require('axios');

/**
 * Discourse Aggregator
 * Fetches user activity and 'Solutions' from a Discourse forum.
 * Inspired by freeCodeCamp's getForumContributions.ts
 */

const DISCOURSE_URL = process.env.DISCOURSE_URL || 'https://forum.freecodecamp.org'; // Default or Env

async function fetchDiscourseActivity(username) {
    if (!username) return [];

    console.log(`Fetching Discourse data for: ${username}`);

    try {
        // 1. Get User Data (by username)
        const userUrl = `${DISCOURSE_URL}/u/${username}.json`;
        const { data: userData } = await axios.get(userUrl);

        if (!userData || !userData.user) return [];

        const userId = userData.user.id;
        const contributions = [];

        // 2. Add Summary stats as a 'daily summary' item (optional)
        // Or we can list their recent activity if we query user actions.

        // Let's fetch User Actions (posts, replies, solutions)
        // Endpoint: /user_actions.json?offset=0&username=...&filter=...
        // Filter 4, 5 are often posts/replies. 15 might be solutions? 
        // We'll stick to a generic "Recent Activity" fetch.

        const actionsUrl = `${DISCOURSE_URL}/user_actions.json?offset=0&username=${username}&filter=4,5`;
        const { data: actions } = await axios.get(actionsUrl);

        if (actions && Array.isArray(actions)) {
            actions.slice(0, 10).forEach(action => {
                contributions.push({
                    id: `discourse-${action.post_id}`,
                    platform: 'Forum',
                    type: action.action_type === 5 ? 'reply' : 'post', // Simplification
                    description: `Posted in "${action.title}"`,
                    date: action.created_at.split('T')[0],
                    url: `${DISCOURSE_URL}/t/${action.slug}/${action.topic_id}/${action.post_number}`,
                    status: 'posted'
                });
            });
        }

        // 3. Check for Solutions (Badge worthy!)
        // In FCC script they check `user.accepted_answers`.
        // Let's check the user object we got in step 1.
        if (userData.user.accepted_answers > 0) {
            // We might not have the specific dates for all, but we can add a summary item
            // or just rely on the badge engine to read this if we passed raw stats.
            // For the timeline, let's just show their "Last Solution" if we can find it, 
            // or a generic "Solution Provider" entry.
            contributions.push({
                id: `discourse-solutions`,
                platform: 'Forum',
                type: 'solution',
                description: `Provided ${userData.user.accepted_answers} Correct Solutions`,
                date: new Date().toISOString().split('T')[0], // Today
                status: 'accepted'
            });
        }

        return contributions;

    } catch (error) {
        console.error(`Error fetching Discourse data for ${username}:`, error.message);
        return [];
    }
}

module.exports = {
    name: 'Community Forum',
    platform: 'Discourse',
    description: 'Track Posts, Solutions, and Forum Activity.',
    inputs: ['username'],
    fetch: fetchDiscourseActivity
};
