import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // 打包输出目录里有临时文件，被 watch 到会 EBUSY 把 dev server 弄崩
      ignored: ["**/release/**", "**/dist/**", "**/out/**"],
    },
  },
});
