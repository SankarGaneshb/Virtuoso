/**
 * Mock General Aggregator for misc platforms
 */

const mockMiscData = {
    contributions: [
        {
            id: 'fm-1',
            type: 'post',
            platform: 'Forum',
            description: 'Posted tutorial: How to use the API',
            date: '2023-11-05',
            status: 'published'
        },
        {
            id: 'pub-1',
            type: 'article',
            platform: 'Publication',
            description: 'Published article on Medium',
            date: '2023-11-10',
            status: 'published'
        }
    ]
};

async function fetchMiscContributions(userId) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(mockMiscData.contributions);
        }, 100);
    });
}

module.exports = { fetchMiscContributions };
