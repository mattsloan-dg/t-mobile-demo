# Tara — T-Mobile Voice Support Agent Demo

A real-time voice-powered customer support agent for T-Mobile's help center, built with Next.js, Deepgram's Voice Agent API, and Claude. Customers speak naturally to "Tara," who searches help articles, navigates pages, and transfers to specialized agents for account-level issues.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                    │
│                                                             │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────────────┐  │
│  │ Mic/PCM  │──▶│ VoiceAgent   │──▶│ Deepgram Voice      │  │
│  │ capture  │   │ (WebSocket)  │◀──│ Agent API (wss://)  │  │
│  └──────────┘   └──────┬───────┘   │                     │  │
│                        │           │  STT: Flux          │  │
│  ┌──────────┐          │           │  LLM: Claude Sonnet │  │
│  │ Speaker  │◀─────────┘           │  TTS: Aura 2        │  │
│  │ playback │   (PCM audio)        └─────────────────────┘  │
│  └──────────┘                                               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Next.js UI                                           │   │
│  │  • Help center (articles, categories, search)        │   │
│  │  • Voice widget (orb, transcript, activity feed)     │   │
│  │  • Page navigation controlled by the agent           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

The entire voice pipeline runs client-side — the browser connects directly to Deepgram's WebSocket API. The Next.js server only serves the UI and provides API routes for article search and session tokens.

## Multi-Agent System

Tara uses a multi-agent architecture where specialized agents handle different domains. Transfers happen mid-conversation via Deepgram's `UpdateThink` / `UpdateSpeak` messages — the WebSocket stays open and the customer experiences a seamless handoff.

### Knowledge Agent (entry point)

The default agent. Helps customers find answers by searching and navigating T-Mobile help center articles.

**Tools:**

- `search_help_articles` — keyword search across 80 help articles (RAG)
- `navigate_to_article` — push the browser to a specific article page
- `transfer_to_agent` — hand off to a specialist or human

**Transfer routing** is determined by a `transfer_to` parameter:
| Value | Target |
|-------|--------|
| `2fa` | 2FA Agent |
| `account_lockout` | Account Lockout Agent |
| `human` | Human escalation (simulated) |

### 2FA Agent

Handles two-factor authentication inquiries — what method is configured, backup codes, authenticator app issues.

**Tools:**

- `verify_identity` — verify customer by email + date of birth (required first)
- `check_2fa_method` — check configured 2FA method
- `escalate_to_human` — hand off to a human

### Account Lockout Agent

Handles locked/suspended accounts and password resets.

**Tools:**

- `verify_identity` — verify customer by email + date of birth (required first)
- `check_account_status` — check if account is active, locked, or suspended
- `send_password_reset_email` — send a password reset link (**requires explicit customer confirmation**)
- `escalate_to_human` — hand off to a human

> **Guardrail:** The Account Lockout Agent will always ask the customer for explicit verbal confirmation before sending a password reset email. It will never send one proactively.

### Agent Transfer Flow

```
1. Knowledge Agent calls transfer_to_agent({ transfer_to: "2fa", reason: "..." })
2. Client sends FunctionCallResponse back to Deepgram
3. Client sends UpdateThink with 2FA Agent's prompt + functions
4. Deepgram confirms with ThinkUpdated
5. Client sends UpdateSpeak with 2FA Agent's voice
6. Deepgram confirms with SpeakUpdated
7. Client injects the 2FA Agent's greeting via InjectAgentMessage
8. 2FA Agent begins speaking with the customer
```

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── articles/route.ts        # GET — article catalog + context for system prompt
│   │   ├── search-articles/route.ts  # POST — keyword search (RAG endpoint)
│   │   └── session/route.ts          # GET — returns Deepgram API key for WebSocket auth
│   ├── support/
│   │   ├── layout.tsx                # Help center shell (sidebar, nav)
│   │   ├── page.tsx                  # Help center home
│   │   ├── [category]/page.tsx       # Category listing
│   │   └── articles/[slug]/page.tsx  # Individual article page
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Landing → redirects to /support
│
├── components/
│   ├── VoiceWidget.tsx     # Main voice UI container (settings bar, panels)
│   ├── MicButton.tsx       # Mic toggle with animated orb
│   ├── Orb.tsx             # Pulsing magenta orb animation (idle/listening/thinking/speaking)
│   ├── Transcript.tsx      # Scrolling conversation transcript
│   ├── ActivityFeed.tsx    # Debug panel: latency, function calls, RAG results
│   ├── SettingsPanel.tsx   # Voice/LLM selector dropdowns
│   ├── SearchBar.tsx       # Help center article search
│   ├── Sidebar.tsx         # Help center category sidebar
│   ├── TopNav.tsx          # Top navigation bar
│   └── SupportFooter.tsx   # Footer
│
├── lib/
│   ├── agents.ts           # Agent definitions: types, prompts, function schemas
│   ├── voice-agent.ts      # VoiceAgent class — WebSocket client for Deepgram Voice Agent API
│   ├── audio.ts            # Mic capture (16kHz PCM) + audio playback (24kHz PCM)
│   ├── use-voice-agent.ts  # React hook — orchestrates agents, transfers, function calls
│   ├── functions.ts        # Function call handlers (simulated backend responses)
│   ├── rag.ts              # Article loading + keyword search
│   ├── articles.ts         # Article data utilities
│   ├── page-control.ts     # usePageControl hook — agent-driven browser navigation
│   ├── prompt.ts           # Prompt utilities
│   ├── types.ts            # TypeScript types for Deepgram Voice Agent protocol
│   ├── logger.ts           # Structured logger utility
│   └── utils.ts            # General utilities (cn, etc.)
│
├── data/
│   ├── help-articles.json       # T-Mobile article data (title, content, chunks)
│   └── help-articles-full.json  # Full article data
│
├── scripts/
│   └── scrape-help.ts      # Script to scrape T-Mobile help center articles
│
├── Dockerfile              # Production container
└── fly.toml                # Fly.io deployment config
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Deepgram API key](https://console.deepgram.com/) with Voice Agent access

### Setup

```bash
# Install dependencies
npm install

# Create .env with your Deepgram API key
echo "DEEPGRAM_API_KEY=your_key_here" > .env

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click the mic button to start talking to Tara.

### Running Tests

```bash
npm test
```

### Deployment

The project includes a `Dockerfile` and `fly.toml` for deployment to [Fly.io](https://fly.io):

```bash
fly deploy
```

Set your API key as a secret:

```bash
fly secrets set DEEPGRAM_API_KEY=your_key_here
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS, Radix UI primitives
- **Speech-to-Text:** Deepgram Flux (via Voice Agent API)
- **LLM:** Anthropic Claude Sonnet (via Voice Agent API)
- **Text-to-Speech:** Deepgram Aura 2 (via Voice Agent API)
- **Voice Transport:** Direct WebSocket to Deepgram Voice Agent API — no SDK
- **Testing:** Vitest
