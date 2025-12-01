# yt-dlp Troubleshooting & Cookie Management

This guide helps you resolve common `yt-dlp` issues, particularly the "Sign in to confirm you’re not a bot" error, by managing YouTube cookies.

## Common Issues

### "Sign in to confirm you’re not a bot"
This error occurs when YouTube blocks the request because it suspects automated activity. To bypass this, you need to provide valid authentication cookies from a real browser session.

### "Video unavailable"
This can happen for age-restricted content or premium-only videos. Providing cookies from an account with access (e.g., Premium) can resolve this.

## Managing Cookies

We provide a built-in **Cookie Manager** in the Developer Tools to handle cookies easily.

### 1. Export Cookies from Browser
You need to export your YouTube cookies in the "Netscape" format (compatible with `curl`, `wget`, and `yt-dlp`).

**Recommended Extensions:**
- **Chrome/Edge:** [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
- **Firefox:** [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)

**Steps:**
1. Log in to YouTube in your browser.
2. Open the extension.
3. Export cookies for `.youtube.com`.
4. Save the content or copy it to your clipboard.

### 2. Add Cookies to Bot
1. Navigate to the **DevTools** page in the bot's web dashboard.
2. Go to the **Cookies** tab.
3. Click **Add Cookie**.
4. Give it a name (e.g., "My Personal Account").
5. Paste the exported cookie content into the text area.
6. Click **Save Cookie**.

### 3. Cookie Rotation
The bot automatically rotates through active cookies. If a cookie fails (e.g., session expired), it will be marked as failed and the bot will try another active cookie.
- **Success Rate:** Monitor the success/failure rate in the Cookie Manager.
- **Toggle:** You can temporarily disable a cookie without deleting it.

## Advanced Troubleshooting

### Updating yt-dlp
Ensure `yt-dlp` is up to date. The bot uses the binary found in your system PATH or the project root.
```bash
yt-dlp -U
```

### IP Blocking
If you are still getting blocked even with valid cookies, your server's IP might be flagged.
- Try using a proxy (advanced configuration required).
- Rotate cookies more frequently.
- Wait for a few hours/days for the block to expire.
