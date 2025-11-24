import { readFileSync } from "fs";
import { parseQuestions } from "../src/lib/ai-question-bank/qwen-flash.ts";
const buf = readFileSync("../tmp/failed.png");
const base64 = buf.toString("base64");
(async () => {
  try {
    const result = await parseQuestions(base64, { mimeType: "image/png" });
    console.log("ok", result.length);
  } catch (err) {
    console.error("err", err);
  }
})();
