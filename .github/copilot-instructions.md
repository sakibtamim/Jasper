# GitHub Copilot Instructions

This repository is configured to use Model Context Protocol (MCP) servers for local development to provide rich context about the database schema, cloud infrastructure, and filesystem. For hosted environments like this one, this file serves as a descriptive reference to that context. The servers themselves are not executable here.

## Available MCP Servers

### 1. Postgres MCP Server
- **Purpose**: Query and understand the database schema
- **Context**: Tables, columns, relationships, and data structure
- **Example queries**:
  - "What tables are in the database?"
  - "Describe the User table schema"
  - "Show me the relationship between User and Admin tables"

### 2. Google Cloud MCP Server
- **Purpose**: Access Google Cloud Platform resources
- **Context**: Cloud Run services, Storage buckets, Secret Manager secrets
- **Example queries**:
  - "What Cloud Run services are deployed?"
  - "List all storage buckets"
  - "What secrets are in Secret Manager?"

### 3. Filesystem MCP Server
- **Purpose**: Read project files and directory structure
- **Context**: Local file access for non-code files and logs
- **Example queries**:
  - "What files are in the docs directory?"
  - "Show me the content of the deployment logs"

### 4. Context7 MCP Server
- **Purpose**: Retrieve up-to-date documentation for libraries and frameworks
- **Context**: External documentation context
- **Example queries**:
  - "How do I use the new Next.js 15 Image component?"
  - "Find documentation for Zod validation"

### 5. Prisma MCP Server
- **Purpose**: Introspect database schema (alternative to Postgres MCP)
- **Context**: Prisma schema models and relationships
- **Example queries**:
  - "Show me the User model in Prisma"

### 6. GitHub MCP Server
- **Purpose**: Search and read repository content and issues
- **Context**: Issues, Pull Requests, file content via search
- **Example queries**:
  - "Find issues related to authentication"
  - "Search for 'login' in the codebase"

## Using MCP in GitHub Copilot

When answering questions or generating code:
1. **Reference the MCP servers** when database schema or cloud infrastructure context is needed
2. **Use actual table and column names** from the Postgres MCP server
3. **Reference deployed services** from the Google Cloud MCP server
4. **Check existing files** using the Filesystem MCP server before suggesting new ones

## Configuration

The MCP servers are configured in `mcp.json` at the repository root:
- `postgres`: Database access via `modelcontextprotocol-server-postgres`
- `gcloud`: Cloud access via `@google-cloud/gcloud-mcp`
- `filesystem`: File access via `@modelcontextprotocol/server-filesystem`

For local development setup, see `docs/dev/mcp.md`.
