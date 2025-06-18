import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { createSmitheryUrl } from "@smithery/sdk/shared/config.js"

const config = {
  "mem0ApiKey": "m0-FVNPT8VZOlFDTdTjEPi05EiAgSqgG0XKJZ3o7HC4"
}
const serverUrl = createSmitheryUrl("https://server.smithery.ai/@mem0ai/mem0-memory-mcp", { config, apiKey: "48d1f572-ecd6-488f-a9a4-b679a8dc518d"})

const transport = new StreamableHTTPClientTransport(serverUrl)

// Create MCP client
import { Client } from "@modelcontextprotocol/sdk/client/index.js"

const client = new Client({
    name: "Test client",
    version: "1.0.0"
})
await client.connect(transport)

// Use the server tools with your LLM application
const toolsResponse = await client.listTools()
console.log("Tools response:", toolsResponse)
if (toolsResponse.tools) {
    console.log(`Available tools: ${toolsResponse.tools.map(t => t.name).join(", ")}`)
}