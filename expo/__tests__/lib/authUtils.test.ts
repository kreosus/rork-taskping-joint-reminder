import {
  normalizeIdentifier,
  isValidIdentifier,
  sanitizeUser,
} from "../../lib/authUtils";

describe("normalizeIdentifier", () => {
  describe("phone provider", () => {
    it("strips non-digit characters except leading +", () => {
      expect(normalizeIdentifier("phone", "+1 (555) 123-4567")).toBe("+15551234567");
      expect(normalizeIdentifier("phone", "555.123.4567")).toBe("5551234567");
      expect(normalizeIdentifier("phone", "+44 20 7946 0958")).toBe("+442079460958");
    });

    it("trims leading and trailing whitespace", () => {
      expect(normalizeIdentifier("phone", "  +15551234567  ")).toBe("+15551234567");
    });
  });

  describe("apple provider", () => {
    it("preserves original casing (opaque user IDs are case-sensitive)", () => {
      expect(normalizeIdentifier("apple", "ABC123.def456")).toBe("ABC123.def456");
      expect(normalizeIdentifier("apple", "USER@privaterelay.appleid.com")).toBe(
        "USER@privaterelay.appleid.com"
      );
    });

    it("trims whitespace only", () => {
      expect(normalizeIdentifier("apple", "  AppleID123  ")).toBe("AppleID123");
    });
  });

  describe("google and facebook providers", () => {
    it("lowercases email addresses", () => {
      expect(normalizeIdentifier("google", "User@Gmail.COM")).toBe("user@gmail.com");
      expect(normalizeIdentifier("facebook", "DEMO@Facebook.COM")).toBe("demo@facebook.com");
    });

    it("trims whitespace before lowercasing", () => {
      expect(normalizeIdentifier("google", "  User@Gmail.com  ")).toBe("user@gmail.com");
    });
  });
});

describe("isValidIdentifier", () => {
  describe("phone provider", () => {
    it("accepts numbers with a leading +", () => {
      expect(isValidIdentifier("phone", "+15551234567")).toBe(true);
      expect(isValidIdentifier("phone", "+442079460958")).toBe(true);
    });

    it("accepts numbers without a leading +", () => {
      expect(isValidIdentifier("phone", "5551234567")).toBe(true);
      expect(isValidIdentifier("phone", "15551234567")).toBe(true);
    });

    it("rejects numbers that are too short (< 10 digits)", () => {
      expect(isValidIdentifier("phone", "+1234")).toBe(false);
      expect(isValidIdentifier("phone", "123456789")).toBe(false);
    });

    it("rejects numbers that are too long (> 15 digits)", () => {
      expect(isValidIdentifier("phone", "+1234567890123456")).toBe(false);
    });

    it("rejects empty strings", () => {
      expect(isValidIdentifier("phone", "")).toBe(false);
    });
  });

  describe("apple provider", () => {
    it("accepts any non-empty string (opaque user ID)", () => {
      expect(isValidIdentifier("apple", "abc123")).toBe(true);
      expect(isValidIdentifier("apple", "user@privaterelay.appleid.com")).toBe(true);
    });

    it("rejects empty strings", () => {
      expect(isValidIdentifier("apple", "")).toBe(false);
    });
  });

  describe("google and facebook providers", () => {
    it("accepts well-formed email addresses", () => {
      expect(isValidIdentifier("google", "user@gmail.com")).toBe(true);
      expect(isValidIdentifier("facebook", "demo@facebook.com")).toBe(true);
      expect(isValidIdentifier("google", "user+tag@sub.domain.com")).toBe(true);
    });

    it("rejects strings with no @ symbol", () => {
      expect(isValidIdentifier("google", "notanemail")).toBe(false);
    });

    it("rejects strings with no domain dot", () => {
      expect(isValidIdentifier("google", "user@nodot")).toBe(false);
    });

    it("rejects strings with spaces", () => {
      expect(isValidIdentifier("google", "user @gmail.com")).toBe(false);
    });

    it("rejects empty strings", () => {
      expect(isValidIdentifier("google", "")).toBe(false);
    });
  });
});

describe("sanitizeUser", () => {
  const validCandidate = {
    id: "u_001",
    name: "Alice",
    provider: "google",
    identifier: "alice@example.com",
    createdAt: 1710000000000,
  };

  it("returns a valid AppUser for a well-formed candidate", () => {
    const result = sanitizeUser(validCandidate);
    expect(result).toEqual({
      id: "u_001",
      name: "Alice",
      provider: "google",
      identifier: "alice@example.com",
      createdAt: 1710000000000,
    });
  });

  it("normalizes the identifier during sanitization", () => {
    const result = sanitizeUser({ ...validCandidate, identifier: "  ALICE@Example.COM  " });
    expect(result?.identifier).toBe("alice@example.com");
  });

  it("returns null when id is not a string", () => {
    expect(sanitizeUser({ ...validCandidate, id: 42 })).toBeNull();
    expect(sanitizeUser({ ...validCandidate, id: undefined })).toBeNull();
  });

  it("returns null when name is not a string", () => {
    expect(sanitizeUser({ ...validCandidate, name: null })).toBeNull();
  });

  it("returns null when provider is invalid", () => {
    expect(sanitizeUser({ ...validCandidate, provider: "twitter" })).toBeNull();
    expect(sanitizeUser({ ...validCandidate, provider: undefined })).toBeNull();
  });

  it("returns null when identifier is not a string", () => {
    expect(sanitizeUser({ ...validCandidate, identifier: 12345 })).toBeNull();
  });

  it("returns null when createdAt is not a number", () => {
    expect(sanitizeUser({ ...validCandidate, createdAt: "2024-01-01" })).toBeNull();
  });

  it("returns null when the identifier fails format validation", () => {
    expect(sanitizeUser({ ...validCandidate, identifier: "notanemail" })).toBeNull();
    expect(
      sanitizeUser({ ...validCandidate, provider: "phone", identifier: "123" })
    ).toBeNull();
  });

  it("handles a valid phone user", () => {
    const result = sanitizeUser({
      id: "u_002",
      name: "Bob",
      provider: "phone",
      identifier: "+15551234567",
      createdAt: 1710000001000,
    });
    expect(result?.provider).toBe("phone");
    expect(result?.identifier).toBe("+15551234567");
  });
});
