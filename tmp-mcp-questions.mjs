import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "fs";

async function main() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', 'chrome-devtools-mcp@latest', '--headless', '--isolated', '--viewport=1400x900'],
  });
  const client = new Client({ name: 'questions-crawl', version: '1.0.0' });
  try {
    await client.connect(transport);
    console.log('connected');
    await client.callTool({ name: 'new_page', arguments: { url: 'https://filatex.cn/questions' } });
    // 等待资源加载
    await new Promise(r => setTimeout(r, 6000));
    const snapshot = await client.callTool({ name: 'take_snapshot', arguments: {} });
    const requests = await client.callTool({ name: 'list_network_requests', arguments: { pageSize: 200 } });
    const consoleMsgs = await client.callTool({ name: 'list_console_messages', arguments: {} });
    fs.writeFileSync('tmp-questions-snapshot.json', JSON.stringify(snapshot, null, 2));
    fs.writeFileSync('tmp-questions-requests.json', JSON.stringify(requests, null, 2));
    fs.writeFileSync('tmp-questions-console.json', JSON.stringify(consoleMsgs, null, 2));
    console.log('snapshot length', JSON.stringify(snapshot).length);
    console.log('requests length', JSON.stringify(requests).length);
    console.log('console length', JSON.stringify(consoleMsgs).length);
  } catch (e) {
    console.error('crawl failed', e);
  } finally {
    try { await client.close(); } catch (e) {}
  }
}

main();
