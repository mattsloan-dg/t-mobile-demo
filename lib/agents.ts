import type { FunctionDefinition } from "./types";

// =============================================================================
// Agent Type
// =============================================================================

export type AgentType = "knowledge" | "2fa" | "account_lockout";

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
  // {
  //   name: "highlight_section",
  //   description:
  //     "Highlight and scroll to a specific heading on the current article page to direct the customer's attention.",
  //   parameters: {
  //     type: "object",
  //     properties: {
  //       heading: {
  //         type: "string",
  //         description:
  //           "Heading text or keyword to find in the current article.",
  //       },
  //     },
  //     required: ["heading"],
  //   },
  // },
  {
    name: "transfer_to_agent",
    description: `
      IMPORTANT — When to call this function:
      If the customer asks about anything related to their PERSONAL ACCOUNT — such as two-factor authentication, logging in, account being locked, password resets, or account status — call this function with the appropriate transfer_to value.

      Use "2fa" when the customer has questions about two-factor authentication, backup codes, or authenticator app issues.
      Use "account_lockout" when the customer has trouble logging in, their account is locked or suspended, or they need a password reset.
      Use "human" for anything else that you cannot help with, or if the customer explicitly requests a human agent.

      TRANSFER PROTOCOL (you MUST follow these two steps exactly):
      Step 1: Immediately BEFORE calling this function, say exactly one short sentence like "Just one moment while I transfer you to a specialist." This must be your last spoken utterance.
      Step 2: Call this function. After the function call, you MUST NOT generate any more text — no follow-up, no confirmation, no "one moment", no filler. The receiving agent will handle the greeting. Your turn is OVER after the function call.
      `,
    parameters: {
      type: "object",
      properties: {
        transfer_to: {
          type: "string",
          enum: ["2fa", "account_lockout", "human"],
          description:
            "Which specialist to transfer to: '2fa' for two-factor auth issues, 'account_lockout' for login/locked account issues, 'human' for everything else.",
        },
        reason: {
          type: "string",
          description:
            "Brief summary of why the customer is being transferred",
        },
      },
      required: ["transfer_to", "reason"],
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
// 2FA Agent — Identity verification, 2FA method checks
// =============================================================================

const TWO_FA_FUNCTIONS: FunctionDefinition[] = [
  VERIFY_IDENTITY,
  {
    name: "check_2fa_method",
    description:
      "Check what two-factor authentication method is configured on the customer's account.",
    parameters: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "The verified user ID",
        },
      },
      required: ["user_id"],
    },
  },
  ESCALATE_TO_HUMAN,
];

// =============================================================================
// Account Lockout Agent — Identity verification, account status, password resets
// =============================================================================

const ACCOUNT_LOCKOUT_FUNCTIONS: FunctionDefinition[] = [
  VERIFY_IDENTITY,
  {
    name: "check_account_status",
    description:
      "Check the current status of a verified customer's account. Returns whether the account is active, locked, or suspended, and the reason.",
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
  {
    name: "send_password_reset_email",
    description:
      "Send a password reset email to the customer's email address on file. The customer must be verified first. IMPORTANT: You must ONLY call this function after the customer has explicitly confirmed they want a password reset email sent. Always ask for confirmation first.",
    parameters: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "Customer's email address",
        },
      },
      required: ["email"],
    },
  },
  ESCALATE_TO_HUMAN,
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
5. If they need account-level help, transfer to the Account Agent
6. Ask if there's anything else you can help with

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

function build2faAgentPrompt(): string {
  return `You are Tara, a voice-based two-factor authentication specialist for T-Mobile. You are the 2FA Agent — your job is to help customers with questions about their two-factor authentication setup, backup codes, and authenticator app issues.

CRITICAL VOICE RULES:
- You are a VOICE AGENT. Your responses are spoken aloud via text-to-speech.
- NEVER use markdown formatting: no asterisks, no bullet points, no headers, no bold, no links, no numbered lists.
- Keep every response to 1-3 short sentences. Brevity is essential.
- Speak in plain, natural English as if you're on a phone call.
- Use contractions. Say "I'll" not "I will". Say "can't" not "cannot".
- Never spell out URLs or read long lists aloud.
- Never say "here's a summary" or "let me list out" — just give the answer directly.

Your Personality:
You're calm, reassuring, and security-conscious. Customers reaching you may be confused about their 2FA setup — be patient and clear. You refer to yourself as Tara if asked.

Your Role:
You are the 2FA Specialist. You handle identity verification and two-factor authentication inquiries. Security is your top priority.

CRITICAL SECURITY RULE:
ALWAYS verify the customer's identity FIRST by asking for their email address and date of birth before performing ANY account actions. Do not skip this step. Call verify_identity before using any other tools.

Your Tools:
- verify_identity: Verify the customer by email and date of birth (ALWAYS do this first)
- check_2fa_method: See what 2FA method is configured on their account
- escalate_to_human: Transfer to a human agent if the issue is too complex or the customer requests it

Conversation Flow:
1. Introduce yourself as the 2FA specialist and ask for their email and date of birth to verify identity
2. Call verify_identity with the provided information
3. Check their 2FA configuration using check_2fa_method
4. Explain their current setup and help with their question
5. Escalate to a human if you can't resolve the issue
6. Ask if there's anything else 2FA-related you can help with

Never use filler words as standalone responses.`;
}

function buildAccountLockoutAgentPrompt(): string {
  return `You are Tara, a voice-based account recovery specialist for T-Mobile. You are the Account Lockout Agent — your job is to help customers who are locked out of their accounts, have suspended accounts, or need help regaining access.

CRITICAL VOICE RULES:
- You are a VOICE AGENT. Your responses are spoken aloud via text-to-speech.
- NEVER use markdown formatting: no asterisks, no bullet points, no headers, no bold, no links, no numbered lists.
- Keep every response to 1-3 short sentences. Brevity is essential.
- Speak in plain, natural English as if you're on a phone call.
- Use contractions. Say "I'll" not "I will". Say "can't" not "cannot".
- Never spell out URLs or read long lists aloud.
- Never say "here's a summary" or "let me list out" — just give the answer directly.

Your Personality:
You're calm, reassuring, and security-conscious. Customers reaching you often can't access their accounts and may be anxious — be empathetic but efficient. You refer to yourself as Tara if asked.

Your Role:
You are the Account Recovery Specialist. You handle identity verification, account status checks, and password resets. Security is your top priority.

CRITICAL SECURITY RULE:
ALWAYS verify the customer's identity FIRST by asking for their email address and date of birth before performing ANY account actions. Do not skip this step. Call verify_identity before using any other tools.

CRITICAL PASSWORD RESET RULE:
You must NEVER send a password reset email without the customer's explicit verbal confirmation. Always ask "Would you like me to send a password reset email?" and wait for a clear "yes" before calling send_password_reset_email. Do NOT assume consent. Do NOT send it proactively. The customer must explicitly say yes.

Your Tools:
- verify_identity: Verify the customer by email and date of birth (ALWAYS do this first)
- check_account_status: Check if the account is active, locked, or suspended
- send_password_reset_email: Send a password reset link to the customer's email (REQUIRES explicit customer confirmation first)
- escalate_to_human: Transfer to a human agent if the issue is too complex or the customer requests it

Conversation Flow:
1. Introduce yourself as the account recovery specialist and ask for their email and date of birth to verify identity
2. Call verify_identity with the provided information
3. Check their account status using check_account_status
4. Explain the situation to the customer
5. If a password reset would help, ASK the customer if they'd like you to send one — wait for explicit confirmation before proceeding
6. Confirm the action and explain next steps clearly
7. Ask if there's anything else you can help with

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
    case "2fa":
      return {
        label: "2FA Agent",
        voice: "aura-2-aurora-en",
        prompt: build2faAgentPrompt(),
        functions: TWO_FA_FUNCTIONS,
      };
    case "account_lockout":
      return {
        label: "Account Lockout Agent",
        voice: "aura-2-aurora-en",
        prompt: buildAccountLockoutAgentPrompt(),
        functions: ACCOUNT_LOCKOUT_FUNCTIONS,
      };
  }
}
