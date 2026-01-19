/**
 * Badge Logic
 * Evaluates contributions and returns earned badges based on Virtuoso tiers.
 */

const BADGE_RULES = [
    // --- Total Contribution Tiers (Metal/Gem/Celestial/Top) ---
    { id: 'virtuoso-copper', name: 'Copper Virtuoso', description: '1+ Total Contribution', threshold: 1 },
    { id: 'virtuoso-bronze', name: 'Bronze Virtuoso', description: '5+ Total Contributions', threshold: 5 },
    { id: 'virtuoso-silver', name: 'Silver Virtuoso', description: '10+ Total Contributions', threshold: 10 },
    { id: 'virtuoso-gold', name: 'Gold Virtuoso', description: '25+ Total Contributions', threshold: 25 },
    { id: 'virtuoso-platinum', name: 'Platinum Virtuoso', description: '50+ Total Contributions', threshold: 50 },
    { id: 'virtuoso-diamond', name: 'Diamond Virtuoso', description: '100+ Total Contributions', threshold: 100 },
    { id: 'virtuoso-rhodium', name: 'Rhodium Virtuoso', description: '200+ Total Contributions', threshold: 200 },
    { id: 'virtuoso-obsidian', name: 'Obsidian Virtuoso', description: '300+ Total Contributions', threshold: 300 },
    { id: 'virtuoso-palladium', name: 'Palladium Virtuoso', description: '400+ Total Contributions', threshold: 400 },
    { id: 'virtuoso-astral', name: 'Astral Virtuoso', description: '500+ Total Contributions', threshold: 500 },
    { id: 'virtuoso-galactic', name: 'Galactic Virtuoso', description: '750+ Total Contributions', threshold: 750 },
    { id: 'virtuoso-universal', name: 'Universal Virtuoso', description: '1000+ Total Contributions', threshold: 1000 },
    { id: 'virtuoso-apex', name: 'Apex Virtuoso', description: '2000+ Total Contributions', threshold: 2000 },
    { id: 'virtuoso-mythical', name: 'Mythical Virtuoso', description: '5000+ Total Contributions', threshold: 5000 },

    // --- Skill-based Levels (PR/Code Focus) ---
    {
        id: 'skill-apprentice',
        name: 'Virtuoso Apprentice',
        description: 'Merged your first Pull Request',
        condition: (stats) => stats.prCount >= 1
    },
    {
        id: 'skill-specialist',
        name: 'Virtuoso Specialist',
        description: 'Merged 5+ Pull Requests',
        condition: (stats) => stats.prCount >= 5
    },
    {
        id: 'skill-champion',
        name: 'Virtuoso Champion',
        description: 'Merged 10+ Pull Requests',
        condition: (stats) => stats.prCount >= 10
    },
    {
        id: 'skill-grandmaster',
        name: 'Virtuoso Grandmaster',
        description: 'Merged 25+ Pull Requests',
        condition: (stats) => stats.prCount >= 25
    },

    // --- Shine-based Levels (Special/Diversity) ---
    {
        id: 'shine-radiant',
        name: 'Radiant Virtuoso',
        description: 'Shared knowledge via Publications',
        condition: (stats) => stats.publicationCount > 0
    },
    {
        id: 'community-pillar',
        name: 'Community Pillar',
        description: 'Active on Discord (has Contributor role) and Forums',
        // Check if there is a 'role' type contribution with 'Contributor' or if msg count > 0 (fallback)
        condition: (stats) => stats.hasDiscordRole || stats.discordMsgCount > 0
    },
    {
        id: 'scholar',
        name: 'Scholar',
        description: 'Published an article',
        condition: (stats) => stats.publicationCount > 0
    },
    {
        id: 'shine-luminous',
        name: 'Luminous Virtuoso',
        description: 'All-rounder: Code, Community, and Publications',
        condition: (stats) => stats.prCount > 0 && (stats.discordMsgCount > 0 || stats.forumPostCount > 0) && stats.publicationCount > 0
    }
];

function calculateStats(contributions) {
    const stats = {
        totalCount: contributions.length,
        prCount: 0,
        issueCount: 0,
        discordMsgCount: 0,
        hasDiscordRole: false,
        forumPostCount: 0,
        publicationCount: 0
    };

    contributions.forEach(c => {
        if (c.platform === 'GitHub' && c.type === 'pull_request' && c.status === 'merged') stats.prCount++;
        if (c.platform === 'GitHub' && c.type === 'issue') stats.issueCount++;
        if (c.platform === 'Discord') {
            stats.discordMsgCount++; // Count all discord items as activity
            if (c.type === 'role') stats.hasDiscordRole = true;
        }
        if (c.platform === 'Forum') stats.forumPostCount++;
        if (c.platform === 'Publication') stats.publicationCount++;
    });

    return stats;
}

function awardBadges(contributions) {
    const stats = calculateStats(contributions);
    let earnedBadges = [];

    // 1. Check Threshold Badges (Highest achieved only? Or all? Usually tiers imply highest, but for collection sake let's award the highest unlocked OR all. 
    // Let's award ALL unlocked for now as it looks better on a dashboard to have a collection, 
    // OR usually systems award the highest rank. Let's do Highest Rank per category for Tiers to reduce clutter, but User asked to "award badges" plural.
    // I will return ALL earned badges so they can show off the collection.

    // Actually, for "Copper" -> "Diamond", usually you upgrade. 
    // I will implement a logic to find the *highest* tier badge for the Total Contributions category.
    const tierBadges = BADGE_RULES.filter(r => r.threshold !== undefined);
    const earnedTier = tierBadges
        .filter(r => stats.totalCount >= r.threshold)
        .pop(); // The last one is the highest threshold (since list is ordered)

    if (earnedTier) {
        earnedBadges.push({
            id: earnedTier.id,
            name: earnedTier.name,
            description: earnedTier.description
        });
    }

    // 2. Check Conditional Badges (Skill & Shine) - Award all that apply
    const conditionalBadges = BADGE_RULES.filter(r => r.condition !== undefined);
    conditionalBadges.forEach(rule => {
        if (rule.condition(stats)) {
            earnedBadges.push({
                id: rule.id,
                name: rule.name,
                description: rule.description
            });
        }
    });

    return earnedBadges;
}

module.exports = { awardBadges };
