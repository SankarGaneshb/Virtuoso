/**
 * Mock Discord Aggregator
 * Returns simulated messages and role info.
 */

const mockDiscordData = {
    contributions: [
        {
            id: 'dc-1',
            type: 'message',
            platform: 'Discord',
            description: 'Helped user with installation in #support',
            date: '2023-10-18',
            status: 'sent'
        },
        {
            id: 'dc-2',
            type: 'message',
            platform: 'Discord',
            description: 'Shared resource link in #general',
            date: '2023-10-25',
            status: 'sent'
        }
    ]
};

async function fetchDiscordActivity(userId) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(mockDiscordData.contributions);
        }, 200);
    });
}

module.exports = { fetchDiscordActivity };
