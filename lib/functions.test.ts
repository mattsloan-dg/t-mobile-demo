import { describe, expect, it } from "vitest";
import { getAgentConfig } from "./agents";

describe("agent function definitions", () => {
  it("knowledge agent includes page control and transfer tools", () => {
    const config = getAgentConfig("knowledge");
    const names = config.functions.map((definition) => definition.name);

    expect(names).toContain("navigate_to_article");
    expect(names).toContain("search_help_articles");
    expect(names).toContain("transfer_to_agent");
    expect(names).not.toContain("escalate_to_human");
  });

  it("2fa agent includes identity and 2fa tools", () => {
    const config = getAgentConfig("2fa");
    const names = config.functions.map((definition) => definition.name);

    expect(names).toContain("verify_identity");
    expect(names).toContain("check_2fa_method");
    expect(names).toContain("escalate_to_human");
    expect(names).not.toContain("check_account_status");
    expect(names).not.toContain("send_password_reset_email");
  });

  it("account lockout agent includes identity, status, and password reset tools", () => {
    const config = getAgentConfig("account_lockout");
    const names = config.functions.map((definition) => definition.name);

    expect(names).toContain("verify_identity");
    expect(names).toContain("check_account_status");
    expect(names).toContain("send_password_reset_email");
    expect(names).toContain("escalate_to_human");
    expect(names).not.toContain("check_2fa_method");
  });

  it("2fa and account lockout agents both have escalate_to_human", () => {
    const twoFa = getAgentConfig("2fa");
    const lockout = getAgentConfig("account_lockout");

    const twoFaNames = twoFa.functions.map((f) => f.name);
    const lockoutNames = lockout.functions.map((f) => f.name);

    expect(twoFaNames).toContain("escalate_to_human");
    expect(lockoutNames).toContain("escalate_to_human");
  });
});
