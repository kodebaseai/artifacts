"use client";

import posthog from "posthog-js";
import {
  createContext,
  type JSX,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * Define all feature flags in the application
 * This provides type safety and prevents typos
 */
export const FeatureFlags = {
  USE_TALLY: "use-tally",
  // Add more feature flags here as needed
  // EXAMPLE_FLAG: 'example-flag',
} as const;

export type FeatureFlagName = (typeof FeatureFlags)[keyof typeof FeatureFlags];

/**
 * Feature flags interface for type-safe flag checking
 */
export const featureFlags = {
  /**
   * Check if a feature flag is enabled
   */
  isEnabled: (flagName: FeatureFlagName): boolean => {
    if (typeof window !== "undefined" && posthog) {
      return posthog.isFeatureEnabled(flagName) || false;
    }
    return false;
  },

  /**
   * Get the value of a feature flag (for multivariate flags)
   */
  getValue: <T = unknown>(flagName: FeatureFlagName): T | undefined => {
    if (typeof window !== "undefined" && posthog) {
      return posthog.getFeatureFlag(flagName) as T;
    }
    return undefined;
  },

  /**
   * Get all active feature flags
   */
  getAllFlags: (): Record<string, boolean | string> => {
    if (typeof window !== "undefined" && posthog) {
      // PostHog doesn't have getAllFlags, we need to track them manually
      // or use the feature flag values from PostHog's internal state
      const result: Record<string, boolean | string> = {};

      // Check each defined feature flag
      Object.values(FeatureFlags).forEach((flagName) => {
        const flagValue = posthog.getFeatureFlag(flagName);
        if (flagValue !== undefined) {
          result[flagName] = flagValue;
        }
      });

      return result;
    }
    return {};
  },

  /**
   * Wait for feature flags to load
   */
  onFlagsLoaded: (callback: () => void): void => {
    if (typeof window !== "undefined" && posthog) {
      posthog.onFeatureFlags(callback);
    }
  },

  /**
   * Reload feature flags from the server
   */
  reloadFlags: (): void => {
    if (typeof window !== "undefined" && posthog) {
      posthog.reloadFeatureFlags();
    }
  },
};

/**
 * Context for feature flags
 */
interface FeatureFlagsContextValue {
  flags: Record<string, boolean | string>;
  isLoading: boolean;
  isEnabled: (flagName: FeatureFlagName) => boolean;
  getValue: (flagName: FeatureFlagName) => unknown;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | undefined>(
  undefined,
);

/**
 * Provider component that loads and provides feature flags to children
 */
export function FeatureFlagsProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [flags, setFlags] = useState<Record<string, boolean | string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Skip on server
    if (typeof window === "undefined") {
      return;
    }

    let mounted = true;

    const loadFlags = async () => {
      // Wait for PostHog to be available
      let attempts = 0;
      while (!posthog && attempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      if (!mounted) return;

      if (posthog) {
        // Set up the callback for when flags load
        posthog.onFeatureFlags(() => {
          if (!mounted) return;
          console.log("Feature flags loaded");
          const allFlags = featureFlags.getAllFlags();
          console.log("All flags:", allFlags);
          setFlags(allFlags);
          setIsLoading(false);
        });

        // Check if flags are already loaded
        const currentFlags = featureFlags.getAllFlags();
        if (Object.keys(currentFlags).length > 0) {
          console.log("Flags already loaded:", currentFlags);
          setFlags(currentFlags);
          setIsLoading(false);
        } else {
          // Reload flags
          console.log("Reloading feature flags...");
          posthog.reloadFeatureFlags();
        }
      } else {
        console.warn("PostHog not available after timeout");
        setIsLoading(false);
      }
    };

    loadFlags();

    return () => {
      mounted = false;
    };
  }, []);

  const contextValue: FeatureFlagsContextValue = {
    flags,
    isLoading,
    isEnabled: (flagName: FeatureFlagName) => {
      console.log(
        `Checking flag ${flagName}:`,
        flags[flagName],
        "All flags:",
        flags,
      );
      return flags[flagName] === true || flags[flagName] === "true";
    },
    getValue: (flagName: FeatureFlagName) => {
      return flags[flagName];
    },
  };

  return (
    <FeatureFlagsContext.Provider value={contextValue}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Hook to access feature flags
 */
export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error(
      "useFeatureFlags must be used within a FeatureFlagsProvider",
    );
  }
  return context;
}

/**
 * Hook to check a specific feature flag
 */
export function useFeatureFlag(flagName: FeatureFlagName): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(flagName);
}

/**
 * Component that conditionally renders children based on feature flag
 */
interface FeatureProps {
  flag: FeatureFlagName;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Feature({
  flag,
  children,
  fallback = null,
}: FeatureProps): JSX.Element {
  const isEnabled = useFeatureFlag(flag);
  return <>{isEnabled ? children : fallback}</>;
}
