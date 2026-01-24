/**
 * YouTube Aggregator (Mock)
 * Fetches recent video uploads for a channel.
 */
async function fetchYouTubeActivity(channelId) {
    if (!channelId) return [];

    // Generate MOCK data for Showcase
    // 500 Videos to hit "Diamond/Rhodium" levels
    const videos = [];
    const today = new Date();

    for (let i = 0; i < 500; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - (i % 365)); // Spread over a year
        videos.push({
            id: `yt-${i}`,
            platform: 'YouTube',
            type: 'video',
            description: `Video Tutorial #${500 - i}: Full Stack Mastery`,
            date: d.toISOString().split('T')[0],
            url: 'https://youtube.com/watch?v=mock',
            status: 'published'
        });
    }
    return videos;
}

module.exports = {
    name: 'YouTube',
    platform: 'YouTube',
    description: 'Track published videos and streams.',
    inputs: ['channelId'],
    fetch: fetchYouTubeActivity
};
