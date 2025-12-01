module.exports = {
    apps: [
        {
            name: "Jasper",
            script: "./apps/bot/dist/index.js",
            cwd: "./",
            env: {
                NODE_ENV: "production",
            },
        },
    ],
};
