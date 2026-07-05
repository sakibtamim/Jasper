---
trigger: always_on
---

# 🔍 Code Review & Pull Request Guardrails

## 🛡️ Pre-Merge Delay & Safety Checks

- **Mandatory PR Merge Delay**: Wait at least **10 minutes** before merging any pull request (in main or submodule repositories) to allow reviewers and automated tools to post feedback.
- **Pre-Merge Review Check**: Immediately prior to merge, run the comment fetcher:
  `node scripts/gh-pr-review-comments.js <PR_NUMBER>`
  Address, push, and reply to all feedback before merging.

---

## 📥 Fetching Review Comments

Always use the CLI script to fetch comments. Use temporary, gitignored locations (e.g., `tmp/`) to save comment details. **NEVER** commit review comments files.

```bash
# 1. Discover active reviews
node scripts/gh-pr-review-comments.js <PR_NUMBER>

# 2. Fetch specific review comments
node scripts/gh-pr-review-comments.js <PR_NUMBER> <REVIEW_ID>

# 3. Delta Mode (Fetch only unaddressed comments)
node scripts/gh-pr-review-comments.js <PR_NUMBER> --delta --file ./tmp/new_feedback.md
```

- Parse priority levels from comments: `![critical]`, `![high]`, `![medium]`. Do not ignore feedback without explicit justification.
- **Auto-Proceed**: Execute fixes in focused, atomic commits, push changes, and reply to each thread.

---

## 📊 Review Statistics & Reporting

After addressing comments, post a top-level summary reply on the PR using this exact format:

### 1. High-Level Brief

- **Topic A**: Summary of fix.
- **Topic B**: Summary of fix.

### 2. Reviewer Stats Table

| Reviewer        | Comments | Status     | Latest  |
| :-------------- | :------- | :--------- | :------ |
| **`@username`** | 3        | ✅ 3 Fixed | 10m ago |

### 3. Condensed Stats Panel (Required Details Block)

Include a `<details>` block with this specific format:

```html
<details>
<summary>[Found and addressed a total of <Total> code review feedback from <Count> code reviews left by <ReviewerCount> reviewers between <StartTime> and <EndTime>. This Took ~<Duration> minutes for Antigravity Agent 47. Click to expand]</summary>

- **Reviewers**: <ReviewerCount> (`@reviewer`)
- **Coverage**: 100% Addressed
- **AI-Human Collaboration**: 🤖 Agent 47 x 👤 Reviewers
</details>
```

_Note: Wrap all GitHub usernames in backticks (e.g., `@user`) to prevent unwanted notifications._
