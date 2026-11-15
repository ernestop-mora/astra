// Node loader for the unit tests: resolves "@/..." to src/, adds .ts, loads JSON as a module.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

export async function resolve(specifier, context, next) {
  let target = null;
  if (specifier.startsWith("@/")) target = path.join(src, specifier.slice(2));
  else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:") && !path.extname(specifier)) {
    target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (target) {
    for (const ext of ["", ".ts", ".tsx"]) {
      if (path.extname(target + ext) && existsSync(target + ext)) {
        return { url: pathToFileURL(target + ext).href, shortCircuit: true };
      }
    }
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.endsWith(".json")) {
    const source = `export default ${readFileSync(fileURLToPath(url), "utf8")};`;
    return { format: "module", source, shortCircuit: true };
  }
  return next(url, context);
}
