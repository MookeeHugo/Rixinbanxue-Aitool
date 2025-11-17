import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "fs";

const pages = [
  { slug: 'create-paper', url: 'https://filatex.cn/create-paper' },
  { slug: 'export-source', url: 'https://filatex.cn/export-source' },
  { slug: 'pricing', url: 'https://filatex.cn/pricing' }
];

async function capturePage(client, slug, url) {
  console.log('Opening', url);
  await client.callTool({ name: 'new_page', arguments: { url } });
  await new Promise(r => setTimeout(r, 7000));
  const snapshot = await client.callTool({ name: 'take_snapshot', arguments: {} });
  const requests = await client.callTool({ name: 'list_network_requests', arguments: { pageSize: 200 } });
  const consoleMsgs = await client.callTool({ name: 'list_console_messages', arguments: {} });
  fs.writeFileSync(`tmp-${slug}-snapshot.json`, JSON.stringify(snapshot, null, 2));
  fs.writeFileSync(`tmp-${slug}-requests.json`, JSON.stringify(requests, null, 2));
  fs.writeFileSync(`tmp-${slug}-console.json`, JSON.stringify(consoleMsgs, null, 2));
  console.log(slug, 'done');
}

async function main() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', 'chrome-devtools-mcp@latest', '--headless', '--isolated', '--viewport=1400x900'],
  });
  const client = new Client({ name: 'multi-page-crawl', version: '1.0.0' });
  try {
    await client.connect(transport);
    console.log('connected');
    for (const page of pages) {
      await capturePage(client, page.slug, page.url);
    }
  } catch (e) {
    console.error('crawl failed', e);
  } finally {
    try { await client.close(); } catch (e) {}
  }
}

main();
