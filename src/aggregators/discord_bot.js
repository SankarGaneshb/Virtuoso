const { Client, GatewayIntentBits } = require('discord.js');

// Initialize Client (needs GUILDS and GUILD_MEMBERS intents)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages // Optional, if we want to count stats later
    ]
});

let isReady = false;

client.once('ready', () => {
    console.log(`Discord Bot ready! Logged in as ${client.user.tag}`);
    isReady = true;
});

// Login if Token is present
if (process.env.DISCORD_BOT_TOKEN) {
    client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
        console.error("Failed to login to Discord:", err.message);
    });
} else {
    console.log("No DISCORD_BOT_TOKEN found. Discord integration will be disabled.");
}

async function fetchDiscordMember(userId) {
    if (!isReady) return null;

    try {
        // Iterate over all guilds the bot is in to find the user
        // In a real app, you might specify a specific Guild ID in .env
        const guilds = client.guilds.cache;

        for (const [guildId, guild] of guilds) {
            try {
                const member = await guild.members.fetch(userId);
                if (member) {
                    return {
                        id: member.id,
                        username: member.user.username,
                        displayName: member.displayName,
                        roles: member.roles.cache.map(r => r.name), // List of role names
                        joinedAt: member.joinedAt,
                        avatarUrl: member.user.displayAvatarURL()
                    };
                }
            } catch (e) {
                // User not in this guild, continue
                continue;
            }
        }
        return null; // Not found in any guild
    } catch (error) {
        console.error("Error fetching Discord member:", error);
        return null;
    }
}

async function fetchDiscordActivity(userId) {
    const member = await fetchDiscordMember(userId);
    if (!member) return [];

    // Synthesize "Contributions" from Roles
    // e.g., if they have "Contributor" role, add a timeline item
    const contributions = [];

    const relevantRoles = ['Contributor', 'Core Team', 'Moderator', 'VIP', 'Booster'];

    member.roles.forEach(roleName => {
        if (relevantRoles.includes(roleName)) {
            contributions.push({
                id: `role-${roleName}`,
                platform: 'Discord',
                type: 'role',
                description: `Achieved rank: ${roleName}`,
                date: member.joinedAt.toISOString().split('T')[0], // Use join date as proxy
                status: 'active'
            });
        }
    });

    // Also just add a generic "Joined Discord Community" item
    contributions.push({
        id: `discord-join`,
        platform: 'Discord',
        type: 'join',
        description: `Joined the Discord Community`,
        date: member.joinedAt.toISOString().split('T')[0],
        status: 'joined'
    });

    return contributions;
}

module.exports = {
    name: 'Discord',
    platform: 'Discord',
    description: 'Track Community Roles and Member Activity.',
    inputs: ['userId'], // We store ID for discord usually
    fetch: fetchDiscordActivity
};
