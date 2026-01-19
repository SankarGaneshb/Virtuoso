const github = require('./github');
const discord = require('./discord_bot');
const discourse = require('./discourse');
const youtube = require('./youtube');
const reddit = require('./reddit');
// const crowdin = require('./crowdin'); // Future

const registry = [
    github,
    discord,
    discourse,
    youtube,
    reddit
];

module.exports = {
    getAggregators: () => registry,
    getAggregator: (platform) => registry.find(a => a.platform === platform)
};
