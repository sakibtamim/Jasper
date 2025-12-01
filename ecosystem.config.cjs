module.exports = {
    apps: [
        {
            name: "Jasper",
            script: "pnpm",
            args: "start --filter jasper-bot",
            cwd: "./",
            interpreter: "none",
            env: {
                NODE_ENV: "production",
            },
        },
    ],
};
