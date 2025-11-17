import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', 'chrome-devtools-mcp@latest', '--headless', '--isolated', '--viewport=1280x720'],
  });

  const client = new Client({ name: 'health-check', version: '1.0.0' });
  try {
    await client.connect(transport);
    console.log('MCP connected');
    await client.callTool({ name: 'new_page', arguments: { url: 'https://example.com' } });
    const snapshot = await client.callTool({ name: 'take_snapshot', arguments: {} });
    console.log('Snapshot preview:', snapshot?.content?.[0]?.text?.slice(0, 200));
  } catch (err) {
    console.error('Health check failed', err);
  } finally {
    try { await client.close(); } catch (e) {}
  }
}

main();
