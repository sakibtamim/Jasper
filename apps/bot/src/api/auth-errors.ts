// Custom error classes for auth module
export class DiscordAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscordAPIError";
  }
}

export class DiscordOAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscordOAuthError";
  }
}

export class DatabaseAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseAuthError";
  }
}
