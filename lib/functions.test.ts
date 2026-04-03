import { describe, expect, it } from "vitest";
import { getAgentConfig } from "./agents";

describe("agent function definitions", () => {
  it("knowledge agent includes page control and transfer tools", () => {
    const config = getAgentConfig("knowledge");
    const names = config.functions.map((definition) => definition.name);

    expect(names).toContain("navigate_to_article");
    expect(names).toContain("search_help_articles");
    expect(names).toContain("escalate_call");
    expect(names).not.toContain("escalate_to_human");
  });

  it("billing agent includes identity, billing lookup, and escalation tools", () => {
    const config = getAgentConfig("billing");
    const names = config.functions.map((definition) => definition.name);

    expect(names).toContain("verify_identity");
    expect(names).toContain("lookup_billing");
    expect(names).toContain("escalate_to_human");
  });

  it("cancellation agent only has escalate_to_human", () => {
    const config = getAgentConfig("cancellation");
    const names = config.functions.map((definition) => definition.name);

    expect(names).toContain("escalate_to_human");
    expect(names).toHaveLength(1);
  });

  it("billing and cancellation agents both have escalate_to_human", () => {
    const billing = getAgentConfig("billing");
    const cancellation = getAgentConfig("cancellation");

    const billingNames = billing.functions.map((f) => f.name);
    const cancellationNames = cancellation.functions.map((f) => f.name);

    expect(billingNames).toContain("escalate_to_human");
    expect(cancellationNames).toContain("escalate_to_human");
  });
});
