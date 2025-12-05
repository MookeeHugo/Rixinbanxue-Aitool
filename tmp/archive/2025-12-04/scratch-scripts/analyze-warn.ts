import { promises as fs } from "fs";
import path from "path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env.local") });

const targets = [
  "tests/dataset/02_complex/CPLX-05-proof-heavy-text.jpg",
  "tests/dataset/04_bad_quality/BAD-01-low-resolution.jpg",
  "tests/dataset/04_bad_quality/BAD-05-poor-lighting.jpg",
  "tests/dataset/06_bugs/BUG-01-clip-issue.jpg",
  "tests/dataset/06_bugs/BUG-03-json-parse-regression.jpg"
];

async function main() {
  const { parseQuestionWithCascadingFromBuffer } = await import("../src/lib/ai-question-bank/gemini-vision-client");
  for (const relative of targets) {
    const absolute = path.resolve(process.cwd(), relative);
    const buffer = await fs.readFile(absolute);
    process.env.CURRENT_REGRESSION_FILE = path.basename(relative);
    console.log(`Parsing ${relative} ...`);
    try {
      const result = await parseQuestionWithCascadingFromBuffer(buffer);
      console.log(`  Questions: ${result.questions.length}`);
      const summary = {
        file: relative,
        model: result.model,
        questionNumbers: result.questions.map(q => q.number),
        hasImages: result.questions.map(q => ({ number: q.number, images: q.image_regions?.length || 0 })),
        rawCount: result.rawText?.length || 0
      };
      const outputDir = path.resolve(process.cwd(), "tmp", "warn-analysis");
      await fs.mkdir(outputDir, { recursive: true });
      const targetPath = path.join(outputDir, path.basename(relative).replace(/\.jpg$/i, '.json'));
      await fs.writeFile(targetPath, JSON.stringify(result, null, 2), "utf8");
      await fs.writeFile(targetPath.replace(/\.json$/, '.summary.json'), JSON.stringify(summary, null, 2), "utf8");
    } catch (error) {
      console.error(`  Failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      process.env.CURRENT_REGRESSION_FILE = "";
    }
  }
}

main().catch(error => {
  console.error("warn analysis failed", error);
  process.exit(1);
});
