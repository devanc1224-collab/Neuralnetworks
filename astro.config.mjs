import { defineConfig } from "astro/config";

// Static site. Pages are written as flat files (library.html) so URLs stay clean (/library).
export default defineConfig({
  site: "https://neuralnotess.com",
  build: { format: "file" },
});
