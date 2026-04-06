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

  lookup_billing: async ({ user_id }) => {
    await delay(600);
    return JSON.stringify({
      user_id,
      plan: "T-Mobile Go 5G Plus",
      monthly_charge: "$90.00",
      next_payment_due: "2026-04-15",
      autopay_enabled: true,
      account_balance: "$0.00",
      last_payment: {
        amount: "$90.00",
        date: "2026-03-15",
        method: "Visa ending in 4821",
      },
      data_usage: {
        used_gb: 28.4,
        plan_limit: "Unlimited",
        hotspot_used_gb: 12.1,
        hotspot_limit_gb: 50,
      },
      additional_charges: [
        { description: "Device payment - iPhone 16 Pro", amount: "$27.78" },
        { description: "T-Mobile Protection 360", amount: "$18.00" },
      ],
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
  escalate_call: async ({ escalate_to, reason }) => {
    return JSON.stringify({ escalated: true });
  },

  initiate_cancellation: async ({ reason }) => {
    await delay(300);
    return JSON.stringify({
      acknowledged: true,
      message: "Connecting you with a cancellation specialist.",
    });
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
