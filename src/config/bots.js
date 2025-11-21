require("dotenv").config();

const bots = [
    {
        name: "Jasper",
        token: process.env.DISCORD_TOKEN,
        role: "controller",
    },
];

// Add workers from environment variables
// Format: WORKER_NAME_TOKEN=token
// Or specific known ones
// Misty Token
if (process.env.MISTY_TOKEN) {
    bots.push({ name: "Misty", token: process.env.MISTY_TOKEN, role: "worker" });
}

// Tuki Token
if (process.env.TUKI_TOKEN) {
    bots.push({ name: "Tuki", token: process.env.TUKI_TOKEN, role: "worker" });
}

// Jafraan token
if (process.env.JAFRAAN_TOKEN) {
    bots.push({ name: "Jafraan", token: process.env.JAFRAAN_TOKEN, role: "worker" });
}

// Kalojam Token
if (process.env.KALOJAM_TOKEN) {
    bots.push({ name: "Kalojam", token: process.env.KALOJAM_TOKEN, role: "worker" });
}

// Chomchom Token
if (process.env.CHOMCHOM_TOKEN) {
    bots.push({ name: "Chomchom", token: process.env.CHOMCHOM_TOKEN, role: "worker" });
}

// Jafreen Token
if (process.env.JAFREEN_TOKEN) {
    bots.push({ name: "Jafreen", token: process.env.JAFREEN_TOKEN, role: "worker" });
}

// Chini Token
if (process.env.CHINI_TOKEN) {
    bots.push({ name: "Chini", token: process.env.CHINI_TOKEN, role: "worker" });
}

// Bundle Token
if (process.env.BUNDLE_TOKEN) {
    bots.push({ name: "Bundle", token: process.env.BUNDLE_TOKEN, role: "worker" });
}

// Also support a generic list if needed, but for now explicit names are fun
// You can also parse a JSON string from an env var if you want dynamic scaling

module.exports = bots;
