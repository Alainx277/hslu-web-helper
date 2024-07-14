const esbuild = require("esbuild");
const fs = require("fs");
const { solidPlugin } = require("esbuild-plugin-solid");

esbuild
  .build({
    entryPoints: ["./src/**/content.ts", "./src/background.ts"],
    bundle: true,
    minify: true,
    sourcemap: process.env.NODE_ENV !== "production",
    target: ["chrome58", "firefox57"],
    outdir: "./extension/build",
    define: {
      "process.env.NODE_ENV": `"${process.env.NODE_ENV}"`,
    },
    plugins: [solidPlugin()],
    loader: {
      ".ftl": "text",
    },
  })
  .catch(() => process.exit(1));

if (process.env.BROWSER === "firefox") {
  fs.copyFileSync("manifest-firefox.json", "extension/manifest.json");
} else {
  fs.copyFileSync("manifest-chrome.json", "extension/manifest.json");
}

fs.copyFileSync("LICENSE", "extension/LICENSE");
