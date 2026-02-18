# Authentication Module Documentation

This document serves as the single source of truth for the Authentication module in Jasper. It tracks the current implementation, architecture decisions, and future roadmap.

## Overview

Jasper uses **Discord OAuth2** for authentication. This allows users to sign in using their Discord accounts, enabling integration with Discord servers (guilds) and role-based access control in the future.

## Architecture

### Technology Stack

- **Framework**: Fastify
- **OAuth2 Library**: `@fastify/oauth2`
- **Session Management**: `@fastify/cookie` (Signed HTTP-only cookies)
- **Database**: SQLite (Dev) / Postgres (Prod)

### Authentication Flow

1.  **Initiation**: User clicks "Login" on the frontend, which links to `/api/auth/login`.
2.  **Redirect**: Server redirects user to Discord's OAuth2 authorization page.
3.  **Callback**: Discord redirects user back to `/api/auth/callback` with an authorization code.
4.  **Token Exchange**: Server exchanges the code for an Access Token and Refresh Token.
5.  **User Fetch**: Server fetches the user's profile from Discord (`/users/@me`).
6.  **Persistence**:
    - **User**: Upserted into the `users` table.
    - **Session**: Created in the `sessions` table.
7.  **Cookie**: A signed `session_id` cookie is set on the response.
8.  **Completion**: User is redirected to the dashboard (`/`).

## Configuration

The following environment variables are required in `.env`:

| Variable                | Description                                                    | Example (Dev)                 |
| :---------------------- | :------------------------------------------------------------- | :---------------------------- |
| `DISCORD_CLIENT_ID`     | Application ID from Discord Developer Portal                   | `1234567890`                  |
| `DISCORD_CLIENT_SECRET` | Client Secret from Discord Developer Portal                    | `abcdef...`                   |
| `BASE_URL`              | Public-facing URL of the application (Backend)                 | `http://localhost:3000`       |
| `FRONTEND_URL`          | URL of the React Frontend (for redirects)                      | `http://localhost:5173` (dev) |
| `COOKIE_SECRET`         | Secret key for signing cookies                                 | `secret-change-me`            |
| `ENCRYPTION_KEY`        | **Required**. Key for encrypting OAuth tokens (32+ characters) | `your-super-secret-key-here`  |
| `PBKDF2_ITERATIONS`     | **Optional**. PBKDF2 iterations for key derivation             | `100000` (default)            |

> **Note**: The Redirect URI in the Discord Developer Portal must be set to `${BASE_URL}/api/auth/callback`.

## Database Schema

### `users`

Stores Discord user information and tokens.

| Column          | Type      | Description                                 |
| :-------------- | :-------- | :------------------------------------------ |
| `id`            | TEXT (PK) | Discord User ID                             |
| `username`      | TEXT      | Discord Username                            |
| `discriminator` | TEXT      | Discord Discriminator (0 for new usernames) |
| `avatar`        | TEXT      | Full Avatar URL (Discord CDN)               |
| `access_token`  | TEXT      | OAuth2 Access Token (encrypted at rest)     |
| `refresh_token` | TEXT      | OAuth2 Refresh Token (encrypted at rest)    |
| `expires_at`    | DATETIME  | Token Expiration                            |
| `created_at`    | DATETIME  | User Creation Timestamp                     |
| `updated_at`    | DATETIME  | Last Update Timestamp                       |

**Security**: Access and refresh tokens are encrypted at rest using AES-256-GCM encryption. The encryption key must be provided via the `ENCRYPTION_KEY` environment variable.

### `sessions`

Manages active user sessions.

| Column       | Type      | Description                          |
| :----------- | :-------- | :----------------------------------- |
| `id`         | TEXT (PK) | Session UUID                         |
| `user_id`    | TEXT (FK) | References `users.id`                |
| `expires_at` | DATETIME  | Session Expiration (Default: 7 days) |
| `created_at` | DATETIME  | Session Creation                     |

## API Reference

### `GET /api/auth/login`

Initiates the OAuth2 flow. Redirects to Discord.

### `GET /api/auth/callback`

Handles the OAuth2 callback.

- Exchanges code for tokens.
- Creates/Updates user.
- Creates session.
- Sets `session_id` cookie.
- Redirects to `/`.

### `GET /api/auth/me`

Returns the currently authenticated user.

- **Auth Required**: Yes (Cookie)
- **Response**: `{ user: { id, username, ... } }`

### `POST /api/auth/logout`

Logs out the user.

- Deletes session from database.
- Clears `session_id` cookie.

## Roadmap & Future Work

- [ ] **Middleware**: Implement a Fastify middleware/hook to protect specific routes (e.g., admin dashboard).
- [ ] **Role-Based Access Control (RBAC)**:
    - Fetch user's guilds and roles.
    - Define permissions (e.g., "DJ", "Admin").
- [ ] **Token Refresh**: Implement logic to use the `refresh_token` when the `access_token` expires.
- [ ] **Postgres Implementation**: Fully implement the `upsertUser` and session methods in `PostgresAdapter`.
- [ ] **State Parameter**: Ensure `@fastify/oauth2` is correctly handling the `state` parameter for CSRF protection (it does by default, but verify).
