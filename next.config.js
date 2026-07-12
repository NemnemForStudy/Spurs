const htmlFiles = [
  "community.html",
  "english.html",
  "injuries.html",
  "korean.html",
  "market.html",
  "player.html",
  "players.html",
  "results.html",
  "team.html",
  "teams.html",
  "worldcup.html",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/", destination: "/index.html" },
      { source: "/healthz", destination: "/api/healthz" },
      { source: "/teams", destination: "/teams.html" },
      { source: "/teams/:teamId", destination: "/team.html?team=:teamId" },
      { source: "/community", destination: "/community.html" },
      { source: "/community/:teamId", destination: "/community.html?team=:teamId" },
      ...htmlFiles.map((file) => ({
        source: `/${file}`,
        destination: `/${file}`,
      })),
    ];
  },
  outputFileTracingIncludes: {
    "/api/[...path]": ["./data/**/*.json"],
  },
};

module.exports = nextConfig;
