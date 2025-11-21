import dotenv from "dotenv";
dotenv.config();

export interface BotConfig {
    name: string;
    token: string;
    role: "controller" | "worker";
}

const bots: BotConfig[] = [
    {
        name: "Jasper",
        token: process.env.DISCORD_TOKEN || "",
        role: "controller",
    },
];

// Dynamically load worker bots from environment variables
// Looks for any env var ending in _TOKEN (excluding DISCORD_TOKEN)
// Example: MISTY_TOKEN -> Name: Misty, Role: worker

Object.keys(process.env).forEach((key) => {
    if (key.endsWith("_TOKEN") && key !== "DISCORD_TOKEN") {
        const token = process.env[key];
        if (!token) return;

        // Extract name: MISTY_TOKEN -> Misty, MY_BOT_TOKEN -> My Bot
        const name = key
            .replace("_TOKEN", "")
            .toLowerCase()
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

        bots.push({
            name: name,
            token: token,
            role: "worker",
        });
    }
});

export default bots;
