import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import type { UserConfig, LockFile } from "./types.js";

const CONFIG_FILE = "config.yaml";
const LOCK_FILE = "config.lock.yaml";

export async function readUserConfig(dir: string): Promise<UserConfig | null> {
  try {
    const raw = await readFile(join(dir, CONFIG_FILE), "utf-8");
    return parse(raw) as UserConfig;
  } catch {
    return null;
  }
}

export async function writeUserConfig(
  dir: string,
  config: UserConfig
): Promise<void> {
  await writeFile(join(dir, CONFIG_FILE), stringify(config), "utf-8");
}

export async function readLockFile(dir: string): Promise<LockFile | null> {
  try {
    const raw = await readFile(join(dir, LOCK_FILE), "utf-8");
    return parse(raw) as LockFile;
  } catch {
    return null;
  }
}

export async function writeLockFile(
  dir: string,
  lock: LockFile
): Promise<void> {
  await writeFile(join(dir, LOCK_FILE), stringify(lock), "utf-8");
}
