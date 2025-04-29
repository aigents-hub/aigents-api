# Aigents API

The **aigents-api** repository underpins the Aigents hackathon entry, furnishing both HTTP and WebSocket interfaces for a seamless, AI-augmented vehicle acquisition assistant. Developed as part of the Microsoft AI Agents Hackathon (April 8–30, 2025), it orchestrates multi-modal interactions, real-time streaming, and AI-driven tool invocations.

---

## 🛠️ Prerequisites

Before you begin, ensure your environment meets the following requirements:

- **Node.js** v18.x or higher: runtime for server and build scripts.
- **pnpm** (recommended): install via `npm install -g pnpm` for fast, deterministic dependency management.
- **OpenAI API Key**: required if you enable realtime streaming mode (`USE_OPENAI_REALTIME=true`). Obtain one at <https://platform.openai.com>.
- **Qdrant**: a vector database (self‑hosted or cloud) reachable by host and port for semantic search.
- (Optional) **MinIO**: S3‑compatible object store for media assets and logs.

---

## 🚀 Installation & Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/aigents-api.git
   cd aigents-api
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure your environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` to supply credentials and endpoints (details below).

4. **Start in development mode**

   ```bash
   pnpm start:dev
   ```

   - Live reload via `ts-node-dev` watches for file changes.

5. **Build & run in production**

   ```bash
   pnpm build
   pnpm start:prod
   ```

---

## ⚙️ Environment Configuration (`.env`)

| Variable                | Required      | Description                                                         | Example                                   |
| ----------------------- | ------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| `HOST`                  | ✓             | Bind address for HTTP & WS server                                   | `0.0.0.0`                                 |
| `PORT`                  | ✓             | Port number for all endpoints                                       | `7000`                                    |
| `OPENAI_API_KEY`        | ✓ if realtime | OpenAI secret key for API and streaming                             | `sk-...`                                  |
| `USE_OPENAI_REALTIME`   | ✓             | Toggle realtime streaming (`true` or `false`)                       | `true`                                    |
| `OPENAI_REALTIME_MODEL` | ✓ if realtime | Model ID for streaming (e.g., `gpt-4o-realtime-preview-2024-12-17`) | `gpt-4o-mini-realtime-preview-2025-01-10` |
| `OPENAI_BASE_URL`       |               | Override default OpenAI API base URL                                | `https://api.openai.com/v1`               |
| `QDRANT_HOST`           | ✓             | Hostname or IP of Qdrant server                                     | `localhost`                               |
| `QDRANT_PORT`           | ✓             | Port of Qdrant server                                               | `6333`                                    |
| `QDRANT_API_KEY`        |               | API key for Qdrant if authentication is enabled                     |                                           |
| `CACHE_TTL_SECONDS`     |               | Response cache TTL for HTTP endpoints                               | `60`                                      |
| `MINIO_ENDPOINT`        |               | S3-compatible storage endpoint for file uploads                     | `http://localhost:9000`                   |
| `MINIO_ACCESS_KEY`      |               | Access key for MinIO                                                | `minioadmin`                              |
| `MINIO_SECRET_KEY`      |               | Secret key for MinIO                                                | `minioadmin`                              |

---

## 🏗️ Project Structure

```text
src/
├── main.ts                   # Entry point: sets up NestJS app & CORS
├── app.module.ts             # Root module: imports feature modules
│
├── session/                  # Session management
│   ├── session.service.ts    # SessionContext storage & TTL purge
│   └── session.controller.ts # HTTP endpoint for session bootstrapping
│
├── notification/             # WebSocket NotificationChannel
│   ├── notification.gateway.ts         # Manages subscriptions & broadcasts
│   └── dto/                    # Payload definitions for notifications
│       ├── automobile.dto.ts
│       ├── comparison.dto.ts
│       ├── providers.dto.ts
│       └── news.dto.ts
│
├── conversation/             # WebSocket ConversationChannel
│   ├── conversation.gateway.ts        # Routes audio/text & function calls
│   ├── response-state.service.ts      # Tracks isResponding per session
│   └── tools/                         # Handlers for LLM tool invocations
│       ├── automobile-tool.service.ts
│       ├── comparison-tool.service.ts
│       └── news-tool.service.ts
│
├── vector-store/             # Qdrant integration for semantic search
│   ├── base.vector-store.service.ts
│   ├── automobile.vector-store.service.ts
│   └── embeddings/           # Embeddings service (OpenAI)
│       └── embeddings.service.ts
│
└── processing/               # LangChain workflows & agent definitions
    ├── graphs/               # Workflows (.workflow.ts)
    ├── agents/               # Agent logic (.agent.ts)
    └── nodes/                # Atomic workflow steps
```

---

## 🔧 Core Technologies

| Category                | Libraries & Tools                      | Responsibilities                                               |
| ----------------------- | -------------------------------------- | -------------------------------------------------------------- |
| **Framework**           | NestJS                                 | Modular API, dependency injection, WebSocket gateways          |
| **Realtime streaming**  | OpenAI Realtime WebSocket, VAD         | Bidirectional audio/text streaming, server-side turn detection |
| **Agent orchestration** | LangChain (core, community, langgraph) | Define multi-agent workflows, function-call abstraction        |
| **Semantic search**     | Qdrant (JavaScript client)             | Vector storage, payload indexing, fast retrieval               |
| **Validation & typing** | Zod                                    | Input/output DTO schemas, type safety                          |
| **File & cache**        | MinIO, Multer, cache-manager           | Persist uploads, cache responses                               |
| **API docs**            | @nestjs/swagger, swagger-ui-express    | Auto-generate interactive documentation                        |
| **Utilities**           | uuid, pnpm                             | Unique identifiers, deterministic installs                     |

---

## ⚡ Real-time Conversation Workflow

1. **Connection handshake**
   - Client opens `ws://<HOST>:<PORT>/ws/conversation?sessionId=<uuid>`
   - If `sessionId` is missing or expired, the server rejects the connection.
   - `SessionService` maps `sessionId` → `SessionContext` (subscribers, lastActivity).

2. **OpenAI Realtime initialization** (if enabled)
   - Backend opens a WebSocket to OpenAI with API key.
   - Sends a `session.update` payload:
     - **Modalities**: `['audio','text']`
     - **Instructions**: specialized vehicle support prompt + precise tool definitions.
     - **Audio config**: PCM format, sample rate, turn detection (VAD) settings.
     - **LLM settings**: temperature, max tokens.

3. **Audio streaming loop**
   - Client → server: binary audio chunks (`input_audio_buffer.append`).
   - Server buffers until OpenAI socket ready, then forwards immediately.
   - OpenAI → server: streams back audio (`response.audio.delta`) & text (`response.content_part.added`).
   - Server relays audio deltas to client for low-latency playback; text parts can populate a transcript UI.

4. **Function call detection & dispatch**
   - On `response.created` of type `function_call`, server captures `call_id` & `name`.
   - Aggregates `response.function_call_arguments.delta` into a buffer.
   - Once complete, parses JSON args and invokes the matching handler:

     ```ts
     const handlers = {
       search_automobile: handleSearchFunctionCall,
       compare_automobile: handleCompareFunctionCall,
       news_automobiles:  handleNewsFunctionCall,
     };
     await handlers[name](sessionId, call_id, args);
     ```

5. **Response synchronization**
   - `ResponseStateService` marks when the LLM is speaking (`isResponding=true`) vs. idle.
   - Tool handlers await `isResponding=false` before sending complex notifications to avoid overlap.

---

## 🔍 Tool Handlers & Workflows

### 1. `search_automobile`

- **Fast path**: query Qdrant vector store; if top result score ≥ threshold, return immediately.
- **Deep path**:
  1. Notify UI: `{ event: 'Searching', payload: true }`.
  2. Kick off LangChain workflow:
     - Web crawling nodes fetch spec pages.
     - Zod nodes parse and validate raw HTML → `Car[]` objects.
     - Payloads stored back in Qdrant for future fast queries.
  3. On completion: notify UI (`Searching=false`) & return structured specs.

### 2. `compare_automobile`

- Accepts an array of makes/models.
- Runs parallel fast Qdrant searches for each.
- Aggregates top matches into a comparison table.
- Sends: `{ event: 'Comparison', payload: ComparisonDto }`.

### 3. `news_automobiles`

- Notifies UI of search start.
- Executes a dedicated news LangChain workflow:
  - RSS and news APIs queried.
  - Zod structuring into `NewsDto[]`.
- Sends: `{ event: 'News', payload: NewsDto[] }`.

---

## 📢 Notification Channel: `/ws/notification`

1. **Initialization**

   ```json
   { "action": "init",    "sessionId": "<uuid>" }
   ```

2. **Subscription**

   ```json
   { "action": "subscribe", "event": "Automobile" }
   ```

3. **Broadcast**
   - Gateway maintains `Map<SessionEvent, Set<WebSocket>>`.
   - Methods: `notifyAutomobile()`, `notifyComparison()`, `notifyNews()`, `notifySearching()`.
   - Broadcast payloads in JSON:

     ```json
     { "event": "Automobile", "payload": AutomobileDto }
     ```

Clients can subscribe/unsubscribe dynamically to control UI panels and spinners.

---

## 🛠️ HTTP Endpoints & Swagger UI

- **Session**
  - `POST /session` → `{ sessionId: string }` (create/resume)
- **Direct Routes** (mirroring WS tools)
  - `POST /automobile/search`  → JSON request/response.
  - `POST /automobile/compare` → JSON comparison.
  - `POST /automobile/news`    → JSON news articles.

Access interactive docs at `http://<HOST>:<PORT>/api-docs`.

## 🧪 REST Client Collections

To facilitate easy testing and integrate with your favorite REST client (e.g., VS Code REST Client), `.rest` files are included under the `.rest/` directory:

Use this file to quickly send a comparison request—just update the `@host` and `@sessionId` variables.

### Example. `news_search.rest`

```http
@host = localhost:7000

### General automotive news search
POST http://{{host}}/news/search
Content-Type: application/json

{
  "query": "latest automotive industry developments"
}
```

Leverage these examples in your REST client to validate endpoints and iterate on request payloads rapidly.

---

## 🚀 Deployment & Scaling

- **Environment**: Dockerfile included for containerization.
- **Load balancing**: stateless WS gateways behind a sticky‑session LB.
- **Redis** (optional): for session pub/sub and horizontal scaling.
- **Kubernetes**: manifests available for k8s deployments.

---

## ⚠️ Hackathon Notice

This repository is a **proof-of-concept** for the Microsoft AI Agents Hackathon (Apr 8–30, 2025). It will **not** be maintained beyond the event or evolved beyond the hackathon period.

## Participants

| Name                 |
| -------------------- |
| Nicolas A. Catalogna |
| Juan Carlos Quintero |
