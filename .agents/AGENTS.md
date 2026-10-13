# Pull Request & Code Review Guardrails

- **Mandatory PR Merge Delay**: Never merge any pull request (whether in the host monorepo or a submodule) immediately after creation. Always wait at least 10 minutes before merging to allow automated code review tools (e.g., Gemini, Copilot) and reviewers to complete and post their feedback.
- **Pre-Merge Review Check**: Immediately prior to merging any pull request, always execute the review comment fetcher script (`node scripts/gh-pr-review-comments.js <PR_NUMBER>`) to check for any new feedback. Address, push, and comment on all feedback before merging.
