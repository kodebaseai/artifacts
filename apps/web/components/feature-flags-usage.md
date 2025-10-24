# Feature Flags Usage Guide

This guide explains how to use the feature flags system in the Kodebase web application.

## Setup

1. **Define your feature flags** in `feature-flags.tsx`:

```typescript
export const FeatureFlags = {
  USE_TALLY: 'use-tally',
  NEW_DASHBOARD: 'new-dashboard',
  BETA_FEATURES: 'beta-features',
} as const;
```

2. **Add the FeatureFlagsProvider** to your app layout or root component:

```tsx
import { FeatureFlagsProvider } from '@/components/feature-flags';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>
        <FeatureFlagsProvider>
          {children}
        </FeatureFlagsProvider>
      </body>
    </html>
  );
}
```

## Usage Methods

### 1. Direct API (Client Components)

```typescript
import { featureFlags, FeatureFlags } from '@/components/feature-flags';

// Check if a flag is enabled
if (featureFlags.isEnabled(FeatureFlags.USE_TALLY)) {
  // Show Tally form
} else {
  // Show fallback
}

// Wait for flags to load
featureFlags.onFlagsLoaded(() => {
  console.log('Flags are ready!');
});
```

### 2. React Hooks (Client Components)

```typescript
import { useFeatureFlag, FeatureFlags } from '@/components/feature-flags';

function MyComponent() {
  const showTally = useFeatureFlag(FeatureFlags.USE_TALLY);
  
  if (showTally) {
    return <TallyForm />;
  }
  
  return <EmailCaptureForm />;
}
```

### 3. Feature Component (Declarative)

```tsx
import { Feature, FeatureFlags } from '@/components/feature-flags';

function CTASection() {
  return (
    <Feature 
      flag={FeatureFlags.USE_TALLY}
      fallback={<EmailForm />}
    >
      <TallyIntegration />
    </Feature>
  );
}
```

### 4. With Loading State

```tsx
import { useFeatureFlags } from '@/components/feature-flags';

function MyComponent() {
  const { isLoading, isEnabled } = useFeatureFlags();
  
  if (isLoading) {
    return <Spinner />;
  }
  
  if (isEnabled(FeatureFlags.NEW_DASHBOARD)) {
    return <NewDashboard />;
  }
  
  return <OldDashboard />;
}
```

## Server Components

Feature flags require client-side JavaScript. For server components, create a client wrapper:

```tsx
// cta-wrapper.tsx (client component)
'use client';
import { Feature, FeatureFlags } from '@/components/feature-flags';

export function CTAWrapper({ 
  tallyContent, 
  fallbackContent 
}: { 
  tallyContent: ReactNode;
  fallbackContent: ReactNode;
}) {
  return (
    <Feature flag={FeatureFlags.USE_TALLY} fallback={fallbackContent}>
      {tallyContent}
    </Feature>
  );
}

// page.tsx (server component)
import { CTAWrapper } from './cta-wrapper';
import { TallySection } from './tally-section';
import { EmailSection } from './email-section';

export default function Page() {
  return (
    <CTAWrapper
      tallyContent={<TallySection />}
      fallbackContent={<EmailSection />}
    />
  );
}
```

## PostHog Dashboard

1. Log into PostHog
2. Navigate to "Feature Flags"
3. Create a new flag with the exact name (e.g., `use-tally`)
4. Configure rollout percentage or targeting rules
5. Changes take effect immediately (or after `reloadFlags()`)

## Best Practices

1. **Type Safety**: Always use the `FeatureFlags` constants
2. **Fallbacks**: Always provide fallback behavior
3. **Loading States**: Handle the loading state for critical features
4. **Analytics**: Track feature flag usage with analytics
5. **Cleanup**: Remove flags and code after full rollout

## Testing

```typescript
// Mock feature flags in tests
jest.mock('@/components/feature-flags', () => ({
  featureFlags: {
    isEnabled: (flag: string) => flag === 'use-tally',
  },
  useFeatureFlag: (flag: string) => flag === 'use-tally',
}));
```