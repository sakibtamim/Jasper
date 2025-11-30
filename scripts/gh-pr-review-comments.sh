#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<EOF
Usage:
  $0 <pr-number> <review-id> [--file <output-file>]

Examples:
  # Print all review comments to stdout
  $0 34 3517858180

  # Save comments into a file (creates or appends)
  $0 34 3517858180 --file review.txt

  # Append comments into a markdown file
  $0 34 3517858180 -f review-log.md

Description:
  Fetches all comments under the specified Pull Request review and outputs
  them in a readable format including:
    - Comment ID and author
    - File path and line number
    - State and timestamp
    - Comment body
    - Code diff hunk for context

  Requires: GitHub CLI (gh), with repo authenticated.
EOF
}

OUTPUT_FILE=""
POSITIONAL=()

# Parse flags
while [[ $# -gt 0 ]]; do
  case $1 in
    --help|-h)
      show_help
      exit 0
      ;;
    --file|-f)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    *)
      POSITIONAL+=("$1")
      shift
      ;;
  esac
done

set -- "${POSITIONAL[@]}"

# Validate arguments
if [ "$#" -ne 2 ]; then
  echo "❌ Error: Missing required arguments."
  show_help
  exit 1
fi

PR_NUMBER="$1"
REVIEW_ID="$2"

# Fetch review comments from GitHub API
COMMENTS=$(gh api \
  "repos/:owner/:repo/pulls/${PR_NUMBER}/reviews/${REVIEW_ID}/comments" \
  --jq '.[] |
"------------------------------------------------------------
Comment #\(.id) by \(.user.login) on \(.path):\(.original_line // .line // "N/A")
State: \(.state) | Created: \(.created_at)

\(.body)

Code context:
\(.diff_hunk)

"')

# Output logic
if [[ -n "$OUTPUT_FILE" ]]; then
  echo "$COMMENTS" >> "$OUTPUT_FILE"
  echo "✔ Review comments appended to: $OUTPUT_FILE"
else
  echo "$COMMENTS"
fi
