require("dotenv").config();

const bots = [
    {
        name: "Jasper",
        token: process.env.DISCORD_TOKEN,
        role: "controller",
    },
];

// Dynamically load worker bots from environment variables
// Looks for any env var ending in _TOKEN (excluding DISCORD_TOKEN)
// Example: MISTY_TOKEN -> Name: Misty, Role: worker

Object.keys(process.env).forEach((key) => {
    if (key.endsWith("_TOKEN") && key !== "DISCORD_TOKEN") {
        const token = process.env[key];
        // Extract name: MISTY_TOKEN -> Misty
        const name = key
            .replace("_TOKEN", "")
            .toLowerCase()
            .replace(/^\w/, (c) => c.toUpperCase()); // Title Case

        // Avoid duplicates if user manually added them (though we are replacing the manual list)
        if (!bots.find((b) => b.name === name)) {
            bots.push({
                name: name,
                token: token,
                role: "worker",
            });
        }
    }
});

module.exports = bots;
