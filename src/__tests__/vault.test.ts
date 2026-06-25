import { expect, test, describe } from "vitest";
import { globalCredentialVault } from "../middlewares/vault.js";

describe("Credential Vault Zero-Trust", () => {
  test("getSecret and setSecret should NOT accept tenantId as an argument", () => {
    // To prevent Zero-Trust escalation (plugin passing fake tenantId of others),
    // the Vault function MUST NOT accept tenantId as a parameter. It must automatically extract it from ENV/Context.
    
    // Check interface structure (via function length property)
    expect(globalCredentialVault.getSecret.length).toBe(1); 
    expect(globalCredentialVault.setSecret.length).toBe(2); 
  });
});
