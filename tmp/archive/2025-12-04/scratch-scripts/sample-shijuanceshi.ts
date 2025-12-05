import { promises as fs } from "fs";
import path from "path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { parseQuestionWithCascadingFromBuffer } = await import("../src/lib/ai-question-bank/gemini-vision-client");
  const root = path.resolve(process.cwd(), "shijuanceshi");
  const entries = (await fs.readdir(root)).filter(name => /\.jpe?g$/i.test(name)).sort();
  if (entries.length === 0) {
    console.log("no sample images");
    return;
  }
  const targets = [entries[0], entries[1], entries[entries.length - 2], entries[entries.length - 1]];
  for (const fileName of targets) {
    const absolute = path.join(root, fileName);
    const buffer = await fs.readFile(absolute);
    process.env.CURRENT_REGRESSION_FILE = fileName;
    console.log("Parsing " + fileName + " ...");
    try {
      const result = await parseQuestionWithCascadingFromBuffer(buffer);
      console.log("  Questions: " + result.questions.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("  Failed: " + message);
    } finally {
      process.env.CURRENT_REGRESSION_FILE = "";
    }
  }
}

main().catch(error => {
  console.error("Sample parse failed", error);
  process.exit(1);
});
