---
trigger: always_on
---

# Code Review Workflow

## Fetching PR Review Comments

When addressing code review feedback, use the `scripts/gh-pr-review-comments.sh` script to fetch ALL inline comments from a specific review.

### Method 1: Use the Helper Script (Recommended)

The project includes a helper script to fetch and format review comments.

```bash
# Print all comments to stdout
scripts/gh-pr-review-comments.sh <PR_NUMBER> <REVIEW_ID>

# Save to a file
scripts/gh-pr-review-comments.sh <PR_NUMBER> <REVIEW_ID> --file review_comments.md
```

### Method 2: Get Review ID from URL

The review URL format is: `https://github.com/OWNER/REPO/pull/NUMBER#pullrequestreview-REVIEW_ID`

### Method 3: Get Latest Review ID via CLI

```bash
gh pr view PR_NUMBER --json reviews --jq '.reviews[-1].databaseId'
```

### Important Notes

- **Always use the script** to ensure you get all comments and context.
- Parse priority levels from comment body: `![critical]`, `![high]`, `![medium]`
