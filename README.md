# aigents-api

The **aigents-api** repository contains the backend for the Aigents project, built as part of the Microsoft AI Agents Hackathon (Apr 8–30, 2025). It provides both HTTP endpoints and WebSocket gateways to interact with AI-powered agents designed to assist in vehicle acquisition.

---

## 🛠️ Prerequisites

- **Node.js** ≥ 18.x
- **pnpm** package manager (install via `npm install -g pnpm`)
- A valid **OpenAI API Key** (if using realtime mode)

---

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/aigents-api.git
   cd aigents-api
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure environment**

   - Copy the example file and rename:

     ```bash
     mv .env.example .env
     ```

   - Open `.env` and fill in the values (see **Configuration** section).

---

## ⚙️ Configuration (.env)

The project uses a `.env` file at the root to configure both HTTP server and OpenAI realtime mode.

| Variable                | Description                                                          | Example                              |
| ----------------------- | -------------------------------------------------------------------- | ------------------------------------ |
| `HOST`                  | Server host or IP address                                            | `localhost`                          |
| `PORT`                  | HTTP & WebSocket port                                                | `7000`                               |
| `OPENAI_API_KEY`        | Your OpenAI secret key; get it at <https://platform.openai.com>      | `sk-...`                             |
| `USE_OPENAI_REALTIME`   | Enable realtime mode: `true` or `false`                              | `true`                               |
| `OPENAI_REALTIME_MODEL` | Model name for streaming (e.g. `gpt-4o-realtime-preview-2024-12-17`) | `gpt-4o-realtime-preview-2024-12-17` |
| `OPENAI_BASE_URL`       | (Optional) Custom OpenAI API base URL                                | `https://api.openai.com/v1`          |

---

## 🏃‍♂️ Running the App

- **Development** (with hot reload):

  ```bash
  pnpm start:dev
  ```

- **Production**:

  ```bash
  pnpm build
  pnpm start:prod
  ```

Once running, you'll have:

- **HTTP API** available at `http://<HOST>:<PORT>/`
- **Swagger UI** documentation at `http://<HOST>:<PORT>/api-docs`
- **WebSocket gateways**:
  - Conversation: `ws://<HOST>:<PORT>/ws/conversation`
  - Notification: `ws://<HOST>:<PORT>/ws/notification`

---

## 📦 Scripts

| Script           | Description                      |
| ---------------- | -------------------------------- |
| `pnpm build`     | Compile TypeScript to JavaScript |
| `pnpm start`     | Start server (production mode)   |
| `pnpm start:dev` | Start server with watch/reload   |
| `pnpm lint`      | Run ESLint and fix issues        |
| `pnpm format`    | Run Prettier to format code      |
| `pnpm test`      | Run unit tests                   |

---

## 🔧 Code Quality

- **ESLint** enforces TypeScript best practices and catches common errors.
- **Prettier** formats code to a consistent style (LF line endings, trailing commas, single quotes).
- **VSCode recommended settings** are included in `.vscode/settings.json`.

---

## 🗂️ Project Structure

```sh
├── src
│   ├── app.module.ts        # Root module + global config
│   ├── app.controller.ts    # Basic HTTP endpoint example
│   ├── notification/        # Notification WebSocket gateway
│   ├── conversation/        # Conversation WebSocket gateway
│   └── setup.swagger.ts     # Swagger configuration
├── .env.example             # Environment variable template
├── .eslintrc.js             # ESLint rules & plugins
├── .prettierrc              # Prettier settings
├── package.json             # Scripts & dependencies
├── tsconfig.json            # TypeScript compiler options
└── README.md                # This document
```

---

## ❗ Hackathon Notice

This repository is a demonstration entry for the Microsoft AI Agents Hackathon (Apr 8–30, 2025). It is provided purely for competition and proof-of-concept purposes and will not be maintained or evolved beyond the hackathon period.

## Participants

| Name                 |
| -------------------- |
| Nicolas A. Catalogna |
| Juan Carlos Quintero |
