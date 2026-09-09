/**
 * PROTOTYPE / SPIKE — Deno FS writer (local dogfood only).
 */
import type { Writer } from "./types.ts";

export function denoFsWriter(): Writer {
  return {
    async readText(path: string) {
      return await Deno.readTextFile(path);
    },
    async writeText(path: string, contents: string) {
      await Deno.mkdir(dirname(path), { recursive: true });
      await Deno.writeTextFile(path, contents);
    },
    async remove(path: string) {
      await Deno.remove(path);
    },
    async list(dir: string) {
      const names: string[] = [];
      for await (const entry of Deno.readDir(dir)) {
        names.push(entry.name);
      }
      return names;
    },
  };
}

function dirname(path: string): string {
  const i = path.lastIndexOf("/");
  return i <= 0 ? "." : path.slice(0, i);
}
