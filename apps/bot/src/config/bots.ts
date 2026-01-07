import { DISCORD_TOKEN, getWorkerTokens } from "./env.js";

export interface BotConfig {
  name: string;
  token: string;
  role: "controller" | "worker";
}

const bots: BotConfig[] = [
  {
    name: "Jasper",
    token: DISCORD_TOKEN,
    role: "controller",
  },
];

// Dynamically load worker bots from environment variables
// Looks for any env var ending in _TOKEN (excluding DISCORD_TOKEN)
// Example: MISTY_TOKEN -> Name: Misty, Role: worker
const workerTokens = getWorkerTokens();
for (const worker of workerTokens) {
  bots.push({
    name: worker.name,
    token: worker.token,
    role: "worker",
  });
}

export default bots;
