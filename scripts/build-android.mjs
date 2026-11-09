import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const localAppData = process.env.LOCALAPPDATA;
if (!localAppData) throw new Error("Thiếu biến LOCALAPPDATA");
const programs = path.join(localAppData, "Programs");
const jdkDir = fs.readdirSync(programs).find((name) => /^jdk-21/.test(name));
if (!jdkDir) throw new Error("Không tìm thấy JDK 21 trong " + programs);

const env = {
  ...process.env,
  JAVA_HOME: process.env.JAVA_HOME ?? path.join(programs, jdkDir),
  ANDROID_HOME: process.env.ANDROID_HOME ?? path.join(localAppData, "Android", "Sdk"),
};
const gradle = path.join(root, "android", process.platform === "win32" ? "gradlew.bat" : "gradlew");
const result = spawnSync(gradle, ["assembleDebug"], {
  cwd: path.join(root, "android"),
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);