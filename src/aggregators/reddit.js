/**
 * Reddit Aggregator (Placeholder)
 * Could fetch posts from /u/username.json
 */
async function fetchRedditActivity(username) {
    if (!username) return [];

    console.log(`Fetching Reddit activity for ${username}...`);

    // Generate MOCK data for Showcase
    const posts = [];
    const today = new Date();

    for (let i = 0; i < 200; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - (i % 100));
        posts.push({
            id: `reddit-${i}`,
            platform: 'Reddit',
            type: 'post',
            description: `Reddit Post #${200 - i} in r/webdev`,
            date: d.toISOString().split('T')[0],
            url: 'https://reddit.com/r/webdev',
            status: 'upvoted'
        });
    }
    return posts;
}

module.exports = {
    name: 'Reddit',
    platform: 'Reddit',
    description: 'Track posts and comments on community subreddits.',
    inputs: ['username'],
    fetch: fetchRedditActivity
};
