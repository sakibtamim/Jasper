Addressed Round 3 (Security) feedback:

1.  **Authentication (P0)**: Added strict authentication check to `/api/plugins/install`. The endpoint now rejects unauthenticated requests with 401.
2.  **Zip Slip Prevention (P1)**: Replaced the unsafe `unzip` shell command with `adm-zip`. Added explicit path validation to ensure all extracted files are contained within the target directory, preventing directory traversal attacks.

Ready for re-review!
