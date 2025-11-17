const { Client } = require('@modelcontextprotocol/sdk/dist/cjs/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/dist/cjs/client/stdio.js');

async function run() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', 'chrome-devtools-mcp@latest', '--headless', '--isolated', '--viewport=1280x720'],
  });

  const client = new Client({ name: 'rixin-analysis', version: '1.0.0' });

  try {
    await client.connect(transport);
    console.log('Connected to chrome devtools mcp');

    const url = 'https://filatex.cn/';
    const newPage = await client.callTool({
      name: 'new_page',
      arguments: { url }
    });
    console.log('Opened page', newPage);

    const snapshot = await client.callTool({ name: 'take_snapshot', arguments: {} });
    console.log('Snapshot text preview:\n', JSON.stringify(snapshot, null, 2).slice(0, 2000));
  } catch (err) {
    console.error('Error running MCP client', err);
  } finally {
    try { await client.close(); } catch (e) {}
  }
}

run();
