import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "fs";

const urls = [
  "https://filatex.cn/",
  "https://filatex.cn/questions",
  "https://filatex.cn/resources",
  "https://filatex.cn/create-paper",
  "https://filatex.cn/export-source",
  "https://filatex.cn/apply-space-id",
  "https://filatex.cn/pricing",
  "https://filatex.cn/login",
  "https://filatex.cn/docs/index"
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main(){
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', 'chrome-devtools-mcp@latest', '--headless', '--isolated', '--viewport=1400x900'],
  });
  const client = new Client({ name: 'rixin-analysis', version: '1.0.0' });
  try {
    await client.connect(transport);
    console.log('connected');
    for (const url of urls) {
      console.log('opening', url);
      await client.callTool({ name: 'new_page', arguments: { url } });
      await delay(5000);
      const snapshot = await client.callTool({ name: 'take_snapshot', arguments: {} });
      const requests = await client.callTool({ name: 'list_network_requests', arguments: { pageSize: 50 } });
      const consoleMsgs = await client.callTool({ name: 'list_console_messages', arguments: {} });
      const safe = url.replace(/https?:\/\//,'').replace(/[^a-zA-Z0-9_-]+/g,'-');
      fs.writeFileSync(`tmp-snapshot-${safe}.json`, JSON.stringify(snapshot, null, 2));
      fs.writeFileSync(`tmp-requests-${safe}.json`, JSON.stringify(requests, null, 2));
      fs.writeFileSync(`tmp-console-${safe}.json`, JSON.stringify(consoleMsgs, null, 2));
    }
  } catch (e) {
    console.error('error', e);
  } finally {
    try { await client.close(); } catch (e) {}
  }
}

main();
