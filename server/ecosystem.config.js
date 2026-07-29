module.exports = {
  apps: [
    {
      name: "rentopia-server",
      script: "dist/src/index.js",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};