module.exports = {
    apps: [
        {
            name: "Jasper",
            script: "./apps/bot/dist/src/index.js",
            cwd: "./",
            env: {
                NODE_ENV: "production",
            },
        },
    ],
};
