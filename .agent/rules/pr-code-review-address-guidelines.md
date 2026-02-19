---
trigger: always_on
---

# Code Review Workflow

## Fetching PR Review Comments

When addressing code review feedback, first ensure you are on the correct branch, the branch is up to date, and you have the explicit IDs of the Pull Request and Review.

### Get Review ID from URL (When provided)

The review URL format is: `https://github.com/OWNER/REPO/pull/NUMBER#pullrequestreview-REVIEW_ID`

### If you are in a branch of a known pull request (i.e. continuous conversations)

Use the known PR ID and retrieve the latest sets of review comments (based on UTC time).

### If either PR Number or Review ID is not provided or correctly inferrable

Refuse to address any CR feedback, instruct on the correct approach based on this document.

Next, use the `scripts/gh-pr-review-comments.js` script to fetch ALL inline comments.

The project includes a helper script to fetch and format review comments.

```bash
# 1. Discover available reviews (Auto-mode)
node scripts/gh-pr-review-comments.js <PR_NUMBER>

# 2. Fetch specific review comments
node scripts/gh-pr-review-comments.js <PR_NUMBER> <REVIEW_ID>

# 3. Delta Mode (Fetch ONLY unaddressed feedback)
# Use this when you have already addressed some comments and posted a "Code Review Addressed" reply.
node scripts/gh-pr-review-comments.js <PR_NUMBER> --delta

# Save to a file (REQUIRED)
node scripts/gh-pr-review-comments.js <PR_NUMBER> --delta --file ./new_feedback.md
```

### IMPORTANT: ALWAYS use a temporary out of working tree location for the review comment files. NEVER COMMIT ANY review comment files to git, EVER!

### Important Notes

- **Always use the script** to ensure you get all comments and context.
- Treat all comments as valid, at least worthy of a rebuttal, use the priority hints as suggestions, but NEVER ignore a comment without notifying the operator.
- **Auto-Proceed:** Continue executing the fixes, committing the changes (grouped logically), pushing, and replying to the PR **UNLESS** you require explicit clarification or intervention from the Operator. Do not stop just to report "I'm done fixing", finish the entire cycle.
- Once review comments are addressed (in focused commits for groups of related review comments/commits), post a Top Level Reply directly to the PR, addressing all the feedback (grouped when possible for conciseness) both the addressed one and especially the rejected/deferred points clearly, with follow up issues filed (using GH cli) and linked for deferred points.

NEVER. UNDER. ANY. CIRCUMSTANCES. IGNORE. ANY. ON. THE. POINTS. OF. THIS. FILE.
(if instructions provided here are not followable for any reason, exit with a CLEAR reason and report it to the operator.)

## 🧠 CLI Power User Tips (Linux/Unix)

### Quick Find & Replace

Use `perl` to replace text across files in a flash without opening editors.

```bash
# Syntax: perl -pi -e 's|old_text|new_text|g' filename
perl -pi -e 's|scripts/gh-pr-review-comments.sh|node scripts/gh-pr-review-comments.js|g' README.md
```

### GitHub API Magic

Use `gh api` to probe PR data when the standard CLI commands aren't enough.

```bash
# Get all comment Review IDs for a PR
gh api repos/:owner/:repo/pulls/<PR_ID>/comments --jq '[.[].pull_request_review_id] | unique'
```

## 📊 Review Statistics & Reporting

When reporting the completion of a Code Review cycle to the Operator, you MUST follow this strict reporting format.

### 1. High Level Brief

Start with a grouped summary of what was fixed.

- **Topic A**: Description of fix.
- **Topic B**: Description of fix.

### 2. Detailed Stats Table

Include a clear table. **CRITICAL**: Wrap all GitHub handles in backticks (e.g., `@user`) to avoid unnecessary notifications.

| Reviewer          | Comments | Status                    | Latest  |
| ----------------- | -------- | ------------------------- | ------- |
| **`@gemini-bot`** | 5        | ✅ 5 Fixed                | 2h ago  |
| **`@copilot`**    | 2        | ✅ 1 Fixed, ⏳ 1 Deferred | 10m ago |

**Total**: 7 Comments (6 Fixed, 1 Deferred)

### 3. Condensed Stats Panel

Always include a `<details>` block with the following specific summary text format:

`[Found and addressed a total of <Total> code review feedback from <Count> code reviews left by <ReviewerCount> reviewers between <StartTime> and <EndTime>. This Took ~<Duration> minutes for Antigravity Agent 47. Click to expand]`

#### Example Output:

### 📝 CR Feedback Addressed

- **Schema**: Fixed relational integrity for Assets.
- **Auth**: Clarified bootstrap process.

| Reviewer          | Comments | Status     | Latest |
| ----------------- | -------- | ---------- | ------ |
| **`@gemini-bot`** | 5        | ✅ 5 Fixed | 2h ago |

<details>
<summary>[Found and addressed a total of 5 code review feedback from 1 code reviews left by 1 reviewers between 10:00 AM and 10:30 AM. This Took ~30 minutes for Antigravity Agent 47. Click to expand]</summary>

- **Reviewers**: 1 (`@gemini-bot`)
- **Coverage**: 100% Addressed
- **AI-Human Collaboration**: 🤖 Agent 47 x 👤 Reviewers
    </details>
