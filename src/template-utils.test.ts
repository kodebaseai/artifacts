import { describe, expect, it } from "vitest";
import { generateSlug } from "./template-utils.js";

describe("generateSlug", () => {
  describe("basic transformations", () => {
    it("should convert simple title to lowercase slug", () => {
      expect(generateSlug("My Feature")).toBe("my-feature");
    });

    it("should convert single word to lowercase", () => {
      expect(generateSlug("Feature")).toBe("feature");
    });

    it("should handle already lowercase titles", () => {
      expect(generateSlug("my feature")).toBe("my-feature");
    });

    it("should handle already hyphenated slugs", () => {
      expect(generateSlug("my-feature-title")).toBe("my-feature-title");
    });
  });

  describe("special characters and punctuation", () => {
    it("should replace spaces with hyphens", () => {
      expect(generateSlug("User Authentication System")).toBe(
        "user-authentication-system",
      );
    });

    it("should remove exclamation marks", () => {
      expect(generateSlug("New Feature!")).toBe("new-feature");
    });

    it("should remove question marks", () => {
      expect(generateSlug("Is this working?")).toBe("is-this-working");
    });

    it("should remove periods", () => {
      expect(generateSlug("API v2.0.1")).toBe("api-v2-0-1");
    });

    it("should remove commas", () => {
      expect(generateSlug("Features, bugs, and more")).toBe(
        "features-bugs-and-more",
      );
    });

    it("should remove apostrophes", () => {
      expect(generateSlug("User's Dashboard")).toBe("user-s-dashboard");
    });

    it("should handle parentheses", () => {
      expect(generateSlug("Feature (Beta)")).toBe("feature-beta");
    });

    it("should handle brackets", () => {
      expect(generateSlug("Items [WIP]")).toBe("items-wip");
    });

    it("should handle slashes", () => {
      expect(generateSlug("API/Backend")).toBe("api-backend");
    });

    it("should handle ampersands", () => {
      expect(generateSlug("Users & Permissions")).toBe("users-permissions");
    });

    it("should handle underscores", () => {
      expect(generateSlug("user_auth_system")).toBe("user-auth-system");
    });

    it("should handle colons", () => {
      expect(generateSlug("Step 1: Setup")).toBe("step-1-setup");
    });

    it("should handle semicolons", () => {
      expect(generateSlug("First; Second")).toBe("first-second");
    });
  });

  describe("multiple special characters", () => {
    it("should collapse multiple spaces into single hyphen", () => {
      expect(generateSlug("Multiple    Spaces")).toBe("multiple-spaces");
    });

    it("should collapse mixed special characters into single hyphen", () => {
      expect(generateSlug("Feature!!! & More???")).toBe("feature-more");
    });

    it("should handle special chars at boundaries", () => {
      expect(generateSlug("...Leading and trailing...")).toBe(
        "leading-and-trailing",
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      expect(generateSlug("")).toBe("");
    });

    it("should handle string with only spaces", () => {
      expect(generateSlug("   ")).toBe("");
    });

    it("should handle string with only special characters", () => {
      expect(generateSlug("!!!???")).toBe("");
    });

    it("should trim whitespace from edges", () => {
      expect(generateSlug("  Feature Title  ")).toBe("feature-title");
    });

    it("should remove leading hyphens", () => {
      expect(generateSlug("---feature")).toBe("feature");
    });

    it("should remove trailing hyphens", () => {
      expect(generateSlug("feature---")).toBe("feature");
    });

    it("should remove both leading and trailing hyphens", () => {
      expect(generateSlug("---feature---")).toBe("feature");
    });
  });

  describe("numbers", () => {
    it("should preserve numbers", () => {
      expect(generateSlug("Feature 123")).toBe("feature-123");
    });

    it("should handle version numbers", () => {
      expect(generateSlug("Version 2.0")).toBe("version-2-0");
    });

    it("should handle numeric-only titles", () => {
      expect(generateSlug("2024")).toBe("2024");
    });

    it("should handle mixed alphanumeric", () => {
      expect(generateSlug("API v2 Beta3")).toBe("api-v2-beta3");
    });
  });

  describe("unicode and international characters", () => {
    it("should remove unicode characters", () => {
      expect(generateSlug("Café Feature")).toBe("caf-feature");
    });

    it("should remove emoji", () => {
      expect(generateSlug("Feature 🚀 Launch")).toBe("feature-launch");
    });

    it("should handle mixed ASCII and unicode", () => {
      expect(generateSlug("Hello Wörld")).toBe("hello-w-rld");
    });
  });

  describe("real-world examples", () => {
    it("should handle typical initiative title", () => {
      expect(generateSlug("Core Package v1")).toBe("core-package-v1");
    });

    it("should handle typical milestone title", () => {
      expect(generateSlug("Foundation Services")).toBe("foundation-services");
    });

    it("should handle typical issue title", () => {
      expect(generateSlug("ID Allocation Logic")).toBe("id-allocation-logic");
    });

    it("should handle complex technical title", () => {
      expect(
        generateSlug("REST API v2.0 (Authentication & Authorization)"),
      ).toBe("rest-api-v2-0-authentication-authorization");
    });

    it("should handle title with project name", () => {
      expect(generateSlug("Kodebase: Artifact System")).toBe(
        "kodebase-artifact-system",
      );
    });

    it("should handle long descriptive title", () => {
      expect(
        generateSlug(
          "Implement User Authentication System with OAuth 2.0 Support",
        ),
      ).toBe("implement-user-authentication-system-with-oauth-2-0-support");
    });
  });

  describe("URL safety", () => {
    it("should produce URL-safe output", () => {
      const slug = generateSlug("Feature!@#$%^&*()_+={}[]|\\:;\"'<>,.?/~`");
      expect(slug).toMatch(/^[a-z0-9-]*$/);
    });

    it("should not contain uppercase letters", () => {
      const slug = generateSlug("UPPERCASE TITLE");
      expect(slug).toBe("uppercase-title");
      expect(slug).toMatch(/^[a-z0-9-]*$/);
    });

    it("should not contain spaces", () => {
      const slug = generateSlug("Title With Spaces");
      expect(slug).not.toContain(" ");
    });

    it("should not start or end with hyphen", () => {
      const slug = generateSlug("!!!Feature!!!");
      expect(slug).toBe("feature");
      expect(slug[0]).not.toBe("-");
      expect(slug[slug.length - 1]).not.toBe("-");
    });
  });
});
