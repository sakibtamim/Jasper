---
name: multi-repo-coordination
description: Guidelines and workflows for managing, auditing, addressing code reviews, and syncing changes across a host repository and its submodules or peer repositories.
---

# Multi-Repo Coordination & Submodule Git Workflow

Use this skill when implementing features, addressing reviews, or merging PRs that span both the host repository and any submodules or peer repositories.

## 1. Submodule & Host Development Hygiene

When modifying code in both the host and a submodule:

1. **Always edit and compile the submodule first**:
    - Navigate to the submodule directory (e.g., `apps/bot/src/plugins/garage-band`).
    - Run typecheck/build/test inside or target it via monorepo filters.
2. **Commit and Push the Submodule first**:
    - Verify the submodule branch is correct (e.g., matching the host's feature branch).
    - Stage and commit submodule modifications with a clear conventional commit message.
    - Push the submodule commits to the remote branch.
3. **Bump the Submodule Pointer in the Host**:
    - Navigate to the host root.
    - Stage the submodule pointer change (`git add apps/bot/src/plugins/garage-band`).
    - Commit host-side changes and the pointer change in a single/grouped commit.
    - Push the host commits to the remote branch.

## 2. Pull Request & Code Review Cycles

When addressing code reviews across multiple PRs:

1. **Fetch Reviews Separately**:
    - Run the review fetcher script (e.g., `node scripts/gh-pr-review-comments.js <PR_NUMBER>`) for both the host and submodule PRs.
    - Write the review comments to files outside the repository working tree (e.g., in `/tmp` or the agent's brain directory) to avoid untracked files.
2. **Classify Feedback**:
    - **Accept**: Implementation errors, edge cases, typings, robust URL parsers.
    - **Reject**: Contradictory patterns, incorrect assumptions (explain clearly in the final comment).
    - **Defer**: Non-blocking improvements (file a follow-up GitHub Issue).
3. **Report Addressing**:
    - Once pushed, post a top-level comment to each PR using `gh pr comment`.
    - Structure the comment with:
        - Grouped summary of what was fixed/addressed.
        - A detailed reviewer/comment stats table (wrap GitHub handles in backticks to avoid notifications).
        - A `<details>` summary block in the format:
          `[Found and addressed a total of <Total> code review feedback from <Count> code reviews left by <ReviewerCount> reviewers between <StartTime> and <EndTime>. This Took ~<Duration> minutes for Antigravity Agent 47. Click to expand]`

## 3. Merge & Syncing Sequence

When the PRs are approved and ready to merge:

1. **Merge Submodule PR first**:
    - Run `gh pr merge <Submodule_PR> --merge` (do not squash to preserve history).
2. **Merge Host PR second**:
    - Run `gh pr merge <Host_PR> --merge`.
3. **Sync Local Branches**:
    - Checkout the default branches (`master` on host, `main` on submodule) and pull `origin`.
    - Run `git submodule update --init --recursive` on the host to ensure the local submodule pointer is correct.
    - Delete the local feature branches on both the host and submodule (`git branch -d <branch_name>`).
4. **Close Issue & Comment**:
    - Confirm the parent issue is closed.
    - Post a closing comment referencing both PRs.
