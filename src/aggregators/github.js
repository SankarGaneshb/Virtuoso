/**
 * Real GitHub Aggregator
 * Uses Octokit to fetch public activity.
 */
const { Octokit } = require("@octokit/rest");

// Initialize Octokit (uses GITHUB_TOKEN from .env if available)
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined,
    userAgent: 'CommunityContributionAggregator/1.0'
});

async function fetchGithubContributions(username) {
    if (!username) return [];

    console.log(`Fetching GitHub data for: ${username}`);

    try {
        // Fetch public events for the user
        // We limit to 30 events for this demo to be fast
        const { data: events } = await octokit.rest.activity.listPublicEventsForUser({
            username,
            per_page: 50
        });

        // Transform events into our "Contribution" format
        const contributions = events
            .filter(event => event.type === 'PullRequestEvent' || event.type === 'IssuesEvent' || event.type === 'PushEvent')
            .map(event => {
                let contribution = {
                    id: `gh-${event.id}`,
                    platform: 'GitHub',
                    date: event.created_at.split('T')[0], // YYYY-MM-DD
                    raw: event
                };

                // Map specific event types
                if (event.type === 'PullRequestEvent') {
                    const action = event.payload.action; // opened, closed, etc.
                    const pr = event.payload.pull_request;
                    contribution.type = 'pull_request';

                    // FCC Inspiration: Merged PRs are gold standard
                    if (action === 'closed' && pr.merged) {
                        contribution.status = 'merged';
                        contribution.description = `🚀 Merged PR #${pr.number} in ${event.repo.name}`;
                    } else {
                        contribution.status = action; // opened, closed (unmerged)
                        contribution.description = `${action} PR #${pr.number} in ${event.repo.name}`;
                    }

                    contribution.url = pr.html_url;

                    // Only count "merged" for Code Ninja, but we track all for timeline
                    // The engine checks `status === 'merged'`
                }
                else if (event.type === 'IssuesEvent') {
                    const action = event.payload.action;
                    const issue = event.payload.issue;
                    contribution.type = 'issue';
                    contribution.status = action;
                    contribution.description = `${action} Issue #${issue.number}: ${issue.title}`;
                    contribution.url = issue.html_url;
                }
                else if (event.type === 'PushEvent') {
                    contribution.type = 'commit';
                    contribution.status = 'committed';
                    contribution.description = `Pushed ${event.payload.size} commits to ${event.repo.name}`;
                }

                return contribution;
            });

        return contributions;

    } catch (error) {
        console.error(`Error fetching GitHub data for ${username}:`, error.message);
        // Fallback or return empty array to not crash the dashboard
        return [];
    }
}

// Standard Adapter Interface
module.exports = {
    name: 'GitHub',
    platform: 'GitHub',
    description: 'Track Pull Requests, Issues, and Commits.',
    inputs: ['username'],
    fetch: fetchGithubContributions
};
