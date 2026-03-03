/**
 * Meteor Wormhole — MCP Test Client
 *
 * Connects to a running Meteor app with the wormhole package
 * and exercises the MCP tools.
 *
 * Usage:
 *   cd test-client
 *   npm install
 *   node index.mjs                    # Interactive session
 *   node index.mjs --test             # Automated test run
 *   node index.mjs --url http://...   # Custom server URL
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const args = process.argv.slice(2);
const testMode = args.includes('--test');
const urlArg = args.find((_, i, a) => a[i - 1] === '--url') || 'http://localhost:3000/mcp';

const SEPARATOR = '─'.repeat(50);

async function main() {
  console.log('');
  console.log('🌀 Meteor Wormhole — MCP Test Client');
  console.log(SEPARATOR);
  console.log(`Connecting to: ${urlArg}`);
  console.log('');

  const transport = new StreamableHTTPClientTransport(new URL(urlArg));

  const client = new Client({
    name: 'wormhole-test-client',
    version: '1.0.0',
  });

  try {
    await client.connect(transport);
    console.log('Connected successfully!');
    console.log('');
  } catch (err) {
    console.error('Failed to connect:', err.message);
    console.error('Make sure the Meteor test app is running.');
    process.exit(1);
  }

  // 1. List available tools
  console.log(SEPARATOR);
  console.log('LISTING TOOLS');
  console.log(SEPARATOR);

  let tools;
  try {
    const result = await client.listTools();
    tools = result.tools || [];
    console.log(`Found ${tools.length} tool(s):`);
    for (const tool of tools) {
      console.log(`  - ${tool.name}: ${tool.description || '(no description)'}`);
      if (tool.inputSchema) {
        const props = tool.inputSchema.properties || {};
        const propNames = Object.keys(props);
        if (propNames.length) {
          console.log(`    params: ${propNames.join(', ')}`);
        }
      }
    }
    console.log('');
  } catch (err) {
    console.error('Failed to list tools:', err.message);
    process.exit(1);
  }

  if (testMode) {
    await runTests(client, tools);
  } else {
    await interactiveDemo(client, tools);
  }

  // Clean up
  try {
    await transport.close?.();
  } catch (_e) {
    /* cleanup best-effort */
  }

  console.log('');
  console.log('Done!');
  process.exit(0);
}

async function runTests(client, tools) {
  console.log(SEPARATOR);
  console.log('RUNNING AUTOMATED TESTS');
  console.log(SEPARATOR);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  PASS: ${message}`);
      passed++;
    } else {
      console.error(`  FAIL: ${message}`);
      failed++;
    }
  }

  // Test 1: Tools were discovered
  assert(tools.length > 0, 'At least one tool was discovered');

  // Test 2: Look for expected tools
  const toolNames = tools.map((t) => t.name);
  assert(toolNames.includes('math_add') || toolNames.includes('math.add'), 'math.add tool exists');
  assert(
    toolNames.includes('todos_add') || toolNames.includes('todos.add'),
    'todos.add tool exists',
  );
  assert(
    toolNames.includes('todos_list') || toolNames.includes('todos.list'),
    'todos.list tool exists',
  );

  // Test 3: Call math.add
  console.log('');
  console.log('  Testing math.add(3, 5)...');
  try {
    const mathToolName = toolNames.includes('math_add') ? 'math_add' : 'math.add';
    const result = await client.callTool({ name: mathToolName, arguments: { a: 3, b: 5 } });
    const text = result.content?.[0]?.text || '';
    const parsed = JSON.parse(text);
    assert(parsed.result === 8, `math.add returned ${parsed.result} (expected 8)`);
  } catch (err) {
    console.error(`  FAIL: math.add call failed: ${err.message}`);
    failed++;
  }

  // Test 4: Call todos.add
  console.log('');
  console.log('  Testing todos.add...');
  try {
    const todoToolName = toolNames.includes('todos_add') ? 'todos_add' : 'todos.add';
    const result = await client.callTool({
      name: todoToolName,
      arguments: { title: 'Test from MCP client', priority: 5 },
    });
    const text = result.content?.[0]?.text || '';
    const parsed = JSON.parse(text);
    assert(parsed.title === 'Test from MCP client', `todos.add returned title "${parsed.title}"`);
    assert(parsed.priority === 5, `todos.add returned priority ${parsed.priority}`);
    assert(parsed.id >= 1, `todos.add returned id ${parsed.id}`);
  } catch (err) {
    console.error(`  FAIL: todos.add call failed: ${err.message}`);
    failed++;
  }

  // Test 5: Call todos.list
  console.log('');
  console.log('  Testing todos.list...');
  try {
    const listToolName = toolNames.includes('todos_list') ? 'todos_list' : 'todos.list';
    const result = await client.callTool({ name: listToolName, arguments: {} });
    const text = result.content?.[0]?.text || '';
    const parsed = JSON.parse(text);
    assert(Array.isArray(parsed), 'todos.list returned an array');
    assert(parsed.length >= 1, `todos.list returned ${parsed.length} item(s)`);
  } catch (err) {
    console.error(`  FAIL: todos.list call failed: ${err.message}`);
    failed++;
  }

  // Test 6: Call echo (generic schema with args)
  const echoToolName = toolNames.find((n) => n === 'echo');
  if (echoToolName) {
    console.log('');
    console.log('  Testing echo (generic args)...');
    try {
      const result = await client.callTool({
        name: echoToolName,
        arguments: { args: ['hello', 42, true] },
      });
      const text = result.content?.[0]?.text || '';
      const parsed = JSON.parse(text);
      assert(parsed.echo?.length === 3, `echo returned ${parsed.echo?.length} args`);
    } catch (err) {
      console.error(`  FAIL: echo call failed: ${err.message}`);
      failed++;
    }
  }

  // Summary
  console.log('');
  console.log(SEPARATOR);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(SEPARATOR);

  if (failed > 0) process.exit(1);
}

async function interactiveDemo(client, tools) {
  console.log(SEPARATOR);
  console.log('INTERACTIVE DEMO');
  console.log(SEPARATOR);

  // Demo: add some todos
  const todoToolName = tools.find(
    (t) => t.name.includes('todos_add') || t.name.includes('todos.add'),
  )?.name;
  const listToolName = tools.find(
    (t) => t.name.includes('todos_list') || t.name.includes('todos.list'),
  )?.name;

  if (todoToolName) {
    console.log('Adding a todo...');
    const addResult = await client.callTool({
      name: todoToolName,
      arguments: { title: 'Buy groceries', priority: 4 },
    });
    console.log('Result:', addResult.content?.[0]?.text);
    console.log('');

    console.log('Adding another todo...');
    const addResult2 = await client.callTool({
      name: todoToolName,
      arguments: { title: 'Write documentation', priority: 2 },
    });
    console.log('Result:', addResult2.content?.[0]?.text);
    console.log('');
  }

  if (listToolName) {
    console.log('Listing all todos...');
    const listResult = await client.callTool({
      name: listToolName,
      arguments: {},
    });
    console.log('Result:', listResult.content?.[0]?.text);
    console.log('');
  }

  // Demo: math
  const mathToolName = tools.find(
    (t) => t.name.includes('math_add') || t.name.includes('math.add'),
  )?.name;
  if (mathToolName) {
    console.log('Calling math.add(100, 200)...');
    const mathResult = await client.callTool({
      name: mathToolName,
      arguments: { a: 100, b: 200 },
    });
    console.log('Result:', mathResult.content?.[0]?.text);
    console.log('');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
