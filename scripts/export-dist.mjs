import { cpSync, existsSync, rmSync } from "node:fs";

if (!existsSync("out")) {
  throw new Error("Static export folder 'out' was not created.");
}

if (existsSync("dist")) {
  rmSync("dist", { recursive: true, force: true });
}

cpSync("out", "dist", { recursive: true });
