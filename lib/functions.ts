// =============================================================================
// Function Handlers — simulate backend calls with realistic data
// =============================================================================

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const FUNCTION_HANDLERS: Record<
  string,
  (args: Record<string, string>) => Promise<string>
> = {
  verify_identity: async ({ email, date_of_birth }) => {
    await delay(800);
    return JSON.stringify({
      verified: true,
      user_id: "TM_USR_84721",
      name: "John Smith",
      account_created: "2021-03-15",
      verified_with_dob: Boolean(date_of_birth),
      email: "john.smith@email.com",
      email_masked: email
        ? email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
        : "jo***@email.com",
    });
  },

  check_account_status: async ({ user_id }) => {
    await delay(500);
    return JSON.stringify({
      user_id,
      status: "locked",
      lock_reason: "multiple_failed_login_attempts",
      locked_since: "2026-02-25T14:30:00Z",
      failed_attempts: 5,
      last_successful_login: "2026-02-24T09:15:00Z",
    });
  },

  send_password_reset_email: async ({ email }) => {
    await delay(600);
    return JSON.stringify({
      sent: true,
      email_masked: email
        ? email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
        : "unknown",
      expires_in: "30 minutes",
      message:
        "Password reset email sent successfully. The link will expire in 30 minutes.",
    });
  },

  check_2fa_method: async ({ user_id }) => {
    await delay(400);
    return JSON.stringify({
      user_id,
      method: "authenticator_app",
      app_name: "Google Authenticator",
      backup_codes_available: true,
      sms_fallback_available: true,
      last_2fa_used: "2026-02-24T09:15:00Z",
    });
  },

  escalate_to_human: async ({ user_id, reason }) => {
    await delay(300);
    return JSON.stringify({
      ticket_id: "ESC-2026-08421",
      user_id: user_id ?? "unverified",
      reason,
      estimated_wait: "approximately 3 minutes",
      priority: "high",
      department: "T-Mobile Expert",
      message:
        "Your call is being transferred to a specialist. Estimated wait time is approximately 3 minutes.",
    });
  },

  search_help_articles: async ({ query }) => {
    try {
      const response = await fetch("/api/search-articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      return JSON.stringify(data);
    } catch {
      return JSON.stringify({
        results: [],
        message: "Search temporarily unavailable.",
      });
    }
  },

  // Transfer functions return a simple acknowledgment.
  // The actual agent switch is handled client-side via UpdateThink.
  transfer_to_agent: async ({ transfer_to, reason }) => {
    if (transfer_to === "human") {
      return JSON.stringify({ transferred: true });
    }
    return JSON.stringify({ transferred: true });
  },

};

// =============================================================================
// handleFunctionCall — dispatches incoming FunctionCallRequests to the
// appropriate mock handler and returns the serialised result.
// =============================================================================

export async function handleFunctionCall(
  name: string,
  argsJson: string
): Promise<{ result: string; args: Record<string, unknown> }> {
  const args = JSON.parse(argsJson) as Record<string, string>;
  const handler = FUNCTION_HANDLERS[name];
  if (!handler) {
    return {
      result: JSON.stringify({ error: `Unknown function: ${name}` }),
      args,
    };
  }
  const result = await handler(args);
  return { result, args };
}
