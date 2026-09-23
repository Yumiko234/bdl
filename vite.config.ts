import { defineConfig } from "vite";
import * as react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react.default(), tsconfigPaths()],
  server: { port: Number(process.env.PORT) || 5173 },
});