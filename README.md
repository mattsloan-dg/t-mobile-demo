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

Tara uses a multi-agent architecture where specialized agents handle different domains. Transfers happen mid-conversation via Deepgram's `UpdateThink` messages — the WebSocket stays open and the customer experiences a seamless handoff.

### Knowledge Agent (entry point)

The default agent. Helps customers find answers by searching and navigating T-Mobile help center articles.

**Tools:**

- `search_help_articles` — keyword search across 80 help articles (RAG)
- `navigate_to_article` — push the browser to a specific article page
- `escalate_call` — hand off to a specialist or human
- `initiate_cancellation` — transfer to Cancellation Agent

**Transfer routing** is determined by the `escalate_call` target parameter:
| Value | Target |
|-------|--------|
| `billing` | Billing & Account Agent |
| `human` | Human escalation (simulated) |

Cancellation/downgrade intent triggers `initiate_cancellation` directly.

### Billing & Account Agent

Handles identity-verified account lookups and billing inquiries — plan details, charges, payments, data usage, and autopay status.

**Tools:**

- `verify_identity` — verify customer by email + date of birth (required first)
- `lookup_billing` — retrieve plan, charges, payment status, data usage, and additional charges
- `escalate_call` — hand off to Knowledge Agent (general questions) or human (complex/sensitive issues)
- `initiate_cancellation` — transfer to Cancellation Agent

> **Guardrail:** The Billing Agent always verifies customer identity before performing any account lookups. It does not attempt to upsell or retain customers.

### Cancellation & Downgrade Agent

Gathers detailed reasons for cancellation while the customer waits for a human agent. Activated when either the Knowledge or Billing agent detects cancellation intent.

**Tools:**

- `record_cancellation_reason` — record the customer's detailed cancellation reason and context

> **Guardrail:** The Cancellation Agent listens empathetically and gathers context but does not argue, offer deals, or attempt to retain. Once the reason is recorded, it does not ask further follow-ups.

### Agent Transfer Flow

```
1. Agent calls escalate_call({ target: "billing" }) or initiate_cancellation()
2. Client defers FunctionCallResponse until agent swap completes
3. Client sends UpdateThink with the new agent's prompt + functions
4. Deepgram confirms with ThinkUpdated
5. Client sends deferred FunctionCallResponse with transition message
6. New agent begins speaking with the customer
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
