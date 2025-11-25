# Code Review Workflow

## Fetching PR Review Comments

When addressing code review feedback, use the GitHub GraphQL API to fetch ALL inline comments from a specific review.

### Method 1: Get Review ID from URL
The review URL format is: `https://github.com/OWNER/REPO/pull/NUMBER#pullrequestreview-REVIEW_ID`

The GraphQL node ID format is: `PRR_kwDO...` (you can find this in the API response)

### Method 2: Fetch All Comments from a Review

```bash
gh api graphql -f query='
{
  node(id: "PRR_REVIEW_NODE_ID") {
    ... on PullRequestReview {
      comments(first: 100) {
        nodes {
          path
          body
          diffHunk
          originalLine
        }
      }
    }
  }
}' | jq -r '.data.node.comments.nodes[] | "FILE: \(.path)\nLINE: \(.originalLine)\nCOMMENT: \(.body)\n---"'
```

### Method 3: Get Latest Review

```bash
gh pr view PR_NUMBER --json reviews --jq '.reviews[-1]'
```

### Important Notes

- **Always use GraphQL** to get ALL inline comments, not just the REST API which may miss comments
- The REST API endpoint `/pulls/PR_NUMBER/comments` may not return all comments depending on filters
- Include `first: 100` to ensure you get all comments (adjust if needed)
- Parse priority levels from comment body: `![critical]`, `![high]`, `![medium]`
