// Maps Node/Bun process.platform/arch to release asset triples.
export function resolveTarget() {
  const { platform, arch } = process;
  // Map to Bun compile triples
  const triples = {
    "darwin-arm64": "darwin-arm64",
    "darwin-x64": "darwin-x64",
    "linux-x64": "linux-x64",
    "linux-arm64": "linux-arm64",
    "win32-x64": "windows-x64",
    "win32-arm64": "windows-arm64"
  };
  const key = `${platform}-${arch}`;
  const t = triples[key];
  if (!t) throw new Error(`Unsupported platform/arch: ${key}`);
  return { triple: t };
}