import { promises as fs } from "fs";
import path from "path";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const metadataPath = path.resolve(process.cwd(), "shijuanceshi", "metadata.json");
  const raw = await fs.readFile(metadataPath, "utf8");
  const records: Array<any> = JSON.parse(raw);
  const { parseQuestionWithCascadingFromBuffer } = await import("../src/lib/ai-question-bank/gemini-vision-client");
  const root = path.resolve(process.cwd(), "shijuanceshi");
  let updated = 0;
  let failed = 0;

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (typeof record.expected_count === "number" && record.expected_count > 0) {
      continue;
    }
    const fileName = record.fileName;
    const absolute = path.join(root, fileName);
    const buffer = await fs.readFile(absolute);
    let attempts = 0;
    let success = false;
    while (!success && attempts < 2) {
      attempts += 1;
      process.env.CURRENT_REGRESSION_FILE = fileName;
      console.log(`[${index + 1}/${records.length}] Parsing ${fileName} (try ${attempts}) ...`);
      try {
        const result = await parseQuestionWithCascadingFromBuffer(buffer);
        record.expected_count = result.questions.length;
        if (typeof record.description === "string") {
          record.description = record.description.replace(/题量[^，。]*|待补题量/g, `题量 ${record.expected_count}`);
        } else {
          record.description = `题量 ${record.expected_count}`;
        }
        updated += 1;
        console.log(`  -> ${record.expected_count} questions`);
        success = true;
        await fs.writeFile(metadataPath, JSON.stringify(records, null, 2), "utf8");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  Failed: ${message}`);
        if (attempts >= 2) {
          failed += 1;
          record.expected_count = null;
          record.notes = `待补充：${message}`;
          await fs.writeFile(metadataPath, JSON.stringify(records, null, 2), "utf8");
        }
      } finally {
        process.env.CURRENT_REGRESSION_FILE = "";
      }
    }
  }

  console.log(`Updated ${updated} records, ${failed} pending`);
}

main().catch(error => {
  console.error("fill-shijuanceshi failed", error);
  process.exit(1);
});
