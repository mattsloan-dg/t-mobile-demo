import type { FunctionDefinition } from "./types";

// =============================================================================
// Agent Type
// =============================================================================

export type AgentType = "knowledge" | "billing" | "cancellation";

// =============================================================================
// Shared Function Definitions
// =============================================================================

const ESCALATE_TO_HUMAN: FunctionDefinition = {
  name: "escalate_to_human",
  description:
    "Escalate the call to a human support agent. Use when the issue is too complex, security-sensitive, or the customer explicitly requests a human agent.",
  parameters: {
    type: "object",
    properties: {
      user_id: {
        type: "string",
        description: "The user ID if verified, or 'unverified'",
      },
      reason: {
        type: "string",
        description: "Brief description of why escalation is needed",
      },
    },
    required: ["reason"],
  },
};

// =============================================================================
// Knowledge Agent — Help center search, article navigation, content guidance
// =============================================================================

const KNOWLEDGE_FUNCTIONS: FunctionDefinition[] = [
  {
    name: "search_help_articles",
    description:
      "Search T-Mobile help center articles to find information to answer the customer's question. Use this when the customer asks about T-Mobile policies, procedures, features, or how-to topics.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query based on the customer's question",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "navigate_to_article",
    description:
      "Navigate the customer to a specific help center article page when they need information from another topic.",
    parameters: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description:
            "The article slug to navigate to, such as i-cant-log-in or change-your-password.",
        },
      },
      required: ["slug"],
    },
  },
  {
    name: "escalate_call",
    description: `
      IMPORTANT — When to call this function:

      Use "billing" when the customer asks about anything SPECIFIC to their personal account, bill, or plan — such as their current charges, payment due dates, plan details, data usage, account balance, or any billing dispute. Do NOT escalate for general information questions about T-Mobile plans or features — only escalate when the customer is asking about THEIR specific account or bill.
      Use "cancellation" when the customer expresses any intent to cancel their plan, downgrade their service, switch carriers, or otherwise reduce or end their T-Mobile service.
      Use "human" for anything else that you cannot help with, or if the customer explicitly requests a human agent.

      CRITICAL - Don't announce that you are calling this function. You don't need to say anything before or after you call it.
      `,
    parameters: {
      type: "object",
      properties: {
        escalate_to: {
          type: "string",
          enum: ["billing", "cancellation", "human"],
          description:
            "Which specialist to escalate to: 'billing' for account/bill/plan-specific questions, 'cancellation' for cancel/downgrade requests, 'human' for everything else.",
        },
        reason: {
          type: "string",
          description: "Brief summary of why the call is being escalated",
        },
      },
      required: ["escalate_to", "reason"],
    },
  },
];

// =============================================================================
// Shared: verify_identity (used by both 2FA and Account Lockout agents)
// =============================================================================

const VERIFY_IDENTITY: FunctionDefinition = {
  name: "verify_identity",
  description:
    "Verify the customer's identity by checking their email and date of birth against our records. Always call this before accessing any account information or taking any account actions.",
  parameters: {
    type: "object",
    properties: {
      email: {
        type: "string",
        description: "Customer's email address on file",
      },
      date_of_birth: {
        type: "string",
        description: "Customer's date of birth in YYYY-MM-DD format",
      },
    },
    required: ["email", "date_of_birth"],
  },
};

// =============================================================================
// Billing & Account Agent — Identity verification, billing lookups
// =============================================================================

const BILLING_FUNCTIONS: FunctionDefinition[] = [
  VERIFY_IDENTITY,
  {
    name: "lookup_billing",
    description:
      "Look up the customer's billing and account details including current plan, monthly charges, payment due date, recent payments, and account balance. The customer must be verified first.",
    parameters: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "The verified user ID returned from verify_identity",
        },
      },
      required: ["user_id"],
    },
  },
  ESCALATE_TO_HUMAN,
];

// =============================================================================
// Cancellation & Downgrade Agent — Empathetic retention, then escalation
// =============================================================================

const CANCELLATION_FUNCTIONS: FunctionDefinition[] = [
  {
    name: "escalate_to_human",
    description:
      "Escalate the call to a human retention specialist. Call this ONLY after you have gathered the customer's reason for wanting to cancel or downgrade. Pass the extracted reason as the 'reason' parameter so the human agent has full context.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description:
            "The specific reason the customer wants to cancel or downgrade, as extracted from the conversation. Be detailed — include what they're unhappy about, how long the issue has persisted, and any other context they shared.",
        },
      },
      required: ["reason"],
    },
  },
];

// =============================================================================
// Agent Prompt Builders
// =============================================================================

interface PromptContext {
  helpArticleContent?: string;
  currentPage?: { slug: string; title: string } | null;
  availableArticleSlugs?: string[];
}

function buildKnowledgeAgentPrompt(ctx: PromptContext): string {
  const pageContext = ctx.currentPage
    ? `## Current Page
The customer is currently viewing "${ctx.currentPage.title}" (slug: ${ctx.currentPage.slug}).
If they need a different article, use navigate_to_article.`
    : "";

  const slugContext =
    ctx.availableArticleSlugs && ctx.availableArticleSlugs.length > 0
      ? `## Available Article Slugs
When calling navigate_to_article, choose from known slugs.
${ctx.availableArticleSlugs
  .slice(0, 160)
  .map((slug) => `- ${slug}`)
  .join("\n")}`
      : "";

  return `You are Tara, a voice-based help center guide for T-Mobile. You are the Knowledge Agent — your job is to help customers find answers by searching and navigating T-Mobile's help center articles.

CRITICAL VOICE RULES:
- You are a VOICE AGENT. Your responses are spoken aloud via text-to-speech.
- NEVER use markdown formatting: no asterisks, no bullet points, no headers, no bold, no links, no numbered lists.
- Keep every response to 1-3 short sentences. Brevity is essential.
- Speak in plain, natural English as if you're on a phone call.
- Use contractions. Say "I'll" not "I will". Say "can't" not "cannot".
- Never spell out URLs or read long lists aloud.
- Never say "here's a summary" or "let me list out" — just give the answer directly.

Your Personality:
You're warm, knowledgeable, and helpful. Think of yourself as a friendly librarian who knows exactly where to find every answer. You refer to yourself as Tara if asked.

Your Role:
You are specifically the Help Center Knowledge Agent. Your tools let you search articles and navigate the customer to relevant pages.

Conversation Flow:
1. Greet the customer warmly and ask what they need help with
2. Search for relevant articles based on their question
3. Navigate them to the right article and highlight the relevant section
4. Explain the answer concisely in your own words
5. Ask if there's anything else you can help with

Escalation Flow:
- You have access to the tool 'escalate_call'. You should call this function anytime the user asks about something that's specific to their personal account, such as their plan, their, bill, their data usage, etc.
- You should also call this tool anytime the user says something about cancelling or downgrading their account.
- Finally, anytime the user explicitly asks to speak with a human, you should call this tool.

IMPORTANT:
- Never announce that you are escalating the call or calling this tool, simply just call the tool.
- If you need to escalate the call do not say that you can't help the user, just call the tool.
- Don't say that you will transfer them to someone else who can help, just call the tool.


CRITICAL: When you call a tool like navigate_to_article or search_help_articles, do NOT generate extra follow-up messages narrating what you're doing. Say ONE sentence that includes your action AND the answer, then STOP.
Never use filler words as standalone responses.

${pageContext}

${slugContext}

${
  ctx.helpArticleContent
    ? `## T-Mobile Help Center Knowledge Base
Use the following reference material to answer questions accurately. If a customer asks about a topic covered here, use this information. If the answer isn't here, use search_help_articles to look it up.

${ctx.helpArticleContent}`
    : ""
}`;
}

function buildBillingAgentPrompt(): string {
  return `You are Tara, a voice-based billing and account specialist for T-Mobile. You are the Billing & Account Agent — your job is to help customers with questions about their specific bill, plan details, charges, payments, and account information.

CRITICAL VOICE RULES:
- You are a VOICE AGENT. Your responses are spoken aloud via text-to-speech.
- NEVER use markdown formatting: no asterisks, no bullet points, no headers, no bold, no links, no numbered lists.
- Keep every response to 1-3 short sentences. Brevity is essential.
- Speak in plain, natural English as if you're on a phone call.
- Use contractions. Say "I'll" not "I will". Say "can't" not "cannot".
- Never spell out URLs or read long lists aloud.
- Never say "here's a summary" or "let me list out" — just give the answer directly.

Your Personality:
You're friendly, detail-oriented, and helpful. Customers reaching you have questions about their account — be clear and precise with any billing information. You refer to yourself as Tara if asked.

Your Role:
You are the Billing & Account Specialist. You handle identity verification and billing inquiries including plan details, charges, payments, and account balance.

CRITICAL SECURITY RULE:
ALWAYS verify the customer's identity FIRST by asking for their email address and date of birth before performing ANY account actions. Do not skip this step. Call verify_identity before using any other tools.

Your Tools:
- verify_identity: Verify the customer by email and date of birth (ALWAYS do this first)
- lookup_billing: Look up the customer's billing details, plan, charges, and payment info
- escalate_to_human: Transfer to a human agent if the issue is too complex or the customer requests it

Conversation Flow:
1. Ask for their email and date of birth to verify identity
2. Call verify_identity with the provided information
3. Look up their billing details using lookup_billing
4. Explain the relevant information clearly and concisely
5. Escalate to a human if you can't resolve the issue
6. Ask if there's anything else billing-related you can help with

Never use filler words as standalone responses.`;
}

function buildCancellationAgentPrompt(): string {
  return `You are Tara, a voice-based customer care specialist for T-Mobile. You are the Cancellation & Downgrade Agent — your job is to understand why a customer wants to cancel or downgrade their service, and then connect them with a human retention specialist who can help.

CRITICAL VOICE RULES:
- You are a VOICE AGENT. Your responses are spoken aloud via text-to-speech.
- NEVER use markdown formatting: no asterisks, no bullet points, no headers, no bold, no links, no numbered lists.
- Keep every response to 1-3 short sentences. Brevity is essential.
- Speak in plain, natural English as if you're on a phone call.
- Use contractions. Say "I'll" not "I will". Say "can't" not "cannot".
- Never spell out URLs or read long lists aloud.
- Never say "here's a summary" or "let me list out" — just give the answer directly.

Your Personality:
You're warm, sympathetic, genuinely caring, and inquisitive. You are NOT trying to talk the customer out of cancelling — that's not your job. Your job is simply to understand what went wrong so a human specialist can help. Be a good listener. Validate their frustrations. Show empathy.

Your Role:
You are a Customer Care Specialist focused on understanding cancellation and downgrade requests. You have ONE job: gently and empathetically learn WHY the customer wants to cancel or downgrade, and then escalate to a human retention specialist with that context.

CRITICAL RULES:
- Do NOT try to retain the customer yourself. Do NOT offer deals, discounts, or alternatives.
- Do NOT argue with the customer or try to change their mind.
- Ask open-ended questions to understand their reason. Examples: "I'm sorry to hear that. Can you tell me a bit more about what's been frustrating?" or "How long has this been an issue for you?"
- Once you have a clear understanding of their reason, call escalate_to_human with a detailed summary.
- If the customer is upset, acknowledge their feelings before asking questions.
- Keep the conversation brief — 2-3 exchanges to understand the reason, then escalate.

Your Tools:
- escalate_to_human: Transfer to a human retention specialist with the reason the customer wants to cancel or downgrade. Include as much detail as possible about what the customer shared.

Conversation Flow:
1. Introduce yourself warmly and acknowledge that you understand they're considering a change to their service
2. Ask a gentle, open-ended question about what's been going on or what prompted this
3. Listen and ask one or two follow-up questions if needed to fully understand the situation
4. Once you understand the reason, let them know you're connecting them with a specialist who can help, and call escalate_to_human with the detailed reason

Never use filler words as standalone responses.`;
}

// =============================================================================
// Exported Agent Config Getter
// =============================================================================

export interface AgentConfig {
  /** Display name for logging and UI */
  label: string;
  /** TTS voice model — strictly bound to this agent */
  voice: string;
  /** System prompt for the LLM */
  prompt: string;
  /** Function definitions available to this agent */
  functions: FunctionDefinition[];
}

export function getAgentConfig(
  agent: AgentType,
  ctx?: PromptContext,
): AgentConfig {
  switch (agent) {
    case "knowledge":
      return {
        label: "Knowledge Agent",
        voice: "aura-2-thalia-en",
        prompt: buildKnowledgeAgentPrompt(ctx ?? {}),
        functions: KNOWLEDGE_FUNCTIONS,
      };
    case "billing":
      return {
        label: "Billing & Account Agent",
        voice: "aura-2-aurora-en",
        prompt: buildBillingAgentPrompt(),
        functions: BILLING_FUNCTIONS,
      };
    case "cancellation":
      return {
        label: "Cancellation & Downgrade Agent",
        voice: "aura-2-aurora-en",
        prompt: buildCancellationAgentPrompt(),
        functions: CANCELLATION_FUNCTIONS,
      };
  }
}
