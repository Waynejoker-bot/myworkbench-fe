# Tool Configuration API

## Overview

The Tool Configuration API provides endpoints for managing tool execution display and behavior configuration. It supports fetching default configurations, customizing display settings, and caching for performance.

## Base URL

```
/api/tool-config
```

## Endpoints

### GET /api/tool-config

Fetch the current tool configuration.

#### Request

```typescript
// No request body required
// Query parameters are not supported
```

#### Response

```typescript
{
  config: {
    display: {
      defaultCollapsed: boolean;        // Default: true
      jsonMaxDepth: number;              // Default: 5
      jsonMaxLength: number;             // Default: 1000
      showTimestamp: boolean;            // Default: true
      showDuration: boolean;             // Default: true
      jsonTheme: 'light' | 'dark';       // Default: 'dark'
      statusColors: {
        pending: string;                 // Default: '#64748b'
        running: string;                 // Default: '#3b82f6'
        success: string;                 // Default: '#22c55e'
        error: string;                   // Default: '#ef4444'
      };
    };
    enableRemoteConfig: boolean;         // Default: true
    configApiEndpoint: string;           // Default: '/api/tool-config'
    cacheDuration: number;               // Default: 300000 (5 minutes)
  };
  timestamp: number;                     // Server timestamp
  version: string;                       // Configuration version
}
```

#### Example

```bash
curl -X GET http://localhost:3000/api/tool-config
```

```typescript
import { fetchToolConfig } from '@/api/config';

const response = await fetchToolConfig();
console.log(response.config);
```

---

### POST /api/tool-config

Update tool configuration (optional persistence).

#### Request

```typescript
{
  config: Partial<ToolCallConfig>;  // Configuration fields to update
  persist: boolean;                 // Whether to persist to server storage
}
```

#### Response

Returns the same structure as GET /api/tool-config with the updated configuration.

#### Example

```bash
curl -X POST http://localhost:3000/api/tool-config \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "display": {
        "defaultCollapsed": false
      }
    },
    "persist": true
  }'
```

```typescript
import { updateToolConfig } from '@/api/config';

const response = await updateToolConfig({
  config: {
    display: {
      defaultCollapsed: false,
      jsonMaxLength: 2000,
    },
  },
  persist: true,
});
```

---

## Client API

### fetchToolConfig()

Fetch tool configuration from the server with automatic fallback to defaults.

```typescript
import { fetchToolConfig } from '@/api/config';

const response = await fetchToolConfig();
// Returns: ToolConfigResponse
```

**Features:**
- Automatic error handling
- Fallback to default configuration on failure
- Type-safe response

---

### updateToolConfig()

Update tool configuration on the server.

```typescript
import { updateToolConfig } from '@/api/config';

const response = await updateToolConfig({
  config: {
    display: {
      defaultCollapsed: false,
    },
  },
  persist: true,
});
// Returns: ToolConfigResponse
```

**Features:**
- Validation before sending
- Error handling with detailed messages
- Returns updated configuration

---

### validateToolConfig()

Validate configuration updates before sending to server.

```typescript
import { validateToolConfig } from '@/api/config';

const result = validateToolConfig({
  display: {
    jsonMaxDepth: 15,  // Invalid: > 10
  },
});

console.log(result);
// {
//   valid: false,
//   errors: ['jsonMaxDepth must be between 1 and 10'],
//   warnings: []
// }
```

---

### loadToolConfig()

Load configuration with caching support.

```typescript
import { loadToolConfig } from '@/api/config';

// Load with caching (default)
const config = await loadToolConfig();

// Force refresh from server
const freshConfig = await loadToolConfig(true);

// Use custom cache key
const customConfig = await loadToolConfig(false, 'custom-key');
```

**Features:**
- LocalStorage caching
- Configurable cache duration
- Cache key support for multiple configurations
- Automatic cache invalidation

---

### clearToolConfigCache()

Clear cached configuration from localStorage.

```typescript
import { clearToolConfigCache } from '@/api/config';

// Clear default cache
clearToolConfigCache();

// Clear custom cache
clearToolConfigCache('custom-key');
```

---

### subscribeToToolConfigChanges()

Subscribe to configuration changes across tabs/windows.

```typescript
import { subscribeToToolConfigChanges } from '@/api/config';

const unsubscribe = subscribeToToolConfigChanges((config) => {
  console.log('Configuration updated:', config);
});

// Later: unsubscribe
unsubscribe();
```

**Features:**
- Uses StorageEvent for cross-tab communication
- Automatic cleanup

---

## React Hooks

### useToolConfig()

Main hook for tool configuration management.

```typescript
import { useToolConfig } from '@/hooks/useToolConfig';

function MyComponent() {
  const {
    config,              // Current configuration
    displayConfig,       // Display configuration
    isLoading,           // Loading state
    error,               // Error from last fetch
    isInitialized,       // Whether config has been loaded
    refetch,             // Manually refetch
    updateConfig,        // Update locally
    saveConfig,          // Save to server
    resetToDefaults,     // Reset to defaults
  } = useToolConfig({
    autoFetch: true,
    forceRefresh: false,
    customConfig: {
      display: {
        defaultCollapsed: false,
      },
    },
  });

  return (
    <div>
      <p>Collapsed: {displayConfig.defaultCollapsed}</p>
      <button onClick={() => updateConfig({ display: { defaultCollapsed: true } })}>
        Collapse All
      </button>
    </div>
  );
}
```

---

### useToolDisplayConfig()

Simplified hook for display configuration only.

```typescript
import { useToolDisplayConfig } from '@/hooks/useToolConfig';

function MyComponent() {
  const displayConfig = useToolDisplayConfig();

  return <div>{displayConfig.defaultCollapsed ? 'Collapsed' : 'Expanded'}</div>;
}
```

---

### useToolConfigStatic()

Non-reactive access to configuration (performance-optimized).

```typescript
import { useToolConfigStatic } from '@/hooks/useToolConfig';

function MyComponent() {
  const config = useToolConfigStatic();

  // Config won't trigger re-renders on change
  return <div>{config.display.defaultCollapsed ? 'Yes' : 'No'}</div>;
}
```

---

## Service Layer

### ToolConfigService

Class-based service for advanced usage.

```typescript
import { getToolConfigService } from '@/services/toolConfigService';

const service = getToolConfigService();

// Get current config
const config = service.getConfig();

// Update locally
service.updateConfig({
  display: {
    defaultCollapsed: false,
  },
});

// Fetch from server
await service.fetchConfig(true);  // force refresh

// Save to server
await service.saveConfig({
  config: { /* ... */ },
  persist: true,
});

// Subscribe to changes
const unsubscribe = service.subscribe((config) => {
  console.log('Config changed:', config);
});

// Reset to defaults
service.resetToDefaults();

// Clear cache
service.clearCache();
```

---

## Type Definitions

### ToolCallConfig

```typescript
interface ToolCallConfig {
  display: ToolDisplayConfig;
  enableRemoteConfig: boolean;
  configApiEndpoint: string;
  cacheDuration: number;
}
```

### ToolDisplayConfig

```typescript
interface ToolDisplayConfig {
  defaultCollapsed: boolean;
  jsonMaxDepth: number;
  jsonMaxLength: number;
  showTimestamp: boolean;
  showDuration: boolean;
  jsonTheme: 'light' | 'dark';
  statusColors: {
    pending: string;
    running: string;
    success: string;
    error: string;
  };
}
```

### ToolExecutionStatus

```typescript
enum ToolExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
}
```

---

## Error Handling

All API functions include comprehensive error handling:

```typescript
import { fetchToolConfig } from '@/api/config';

try {
  const response = await fetchToolConfig();
  // Success
} catch (error) {
  // Error is already logged to console
  // Default configuration is returned automatically
  console.error('Failed to fetch config:', error);
}
```

---

## Caching Strategy

1. **LocalStorage Caching**: Configuration is cached in localStorage
2. **Cache Duration**: Default 5 minutes (configurable)
3. **Cache Key**: Supports multiple configurations with different keys
4. **Invalidation**: Automatic invalidation after cache duration
5. **Manual Clear**: Use `clearToolConfigCache()` to clear manually

---

## Validation Rules

### Display Configuration

- `jsonMaxDepth`: Must be between 1 and 10
- `jsonMaxLength`: Should be between 100 and 10000 (warning if out of range)
- `cacheDuration`: Cannot be negative

### API Configuration

- `configApiEndpoint`: Must start with `/`

---

## Default Values

See `src/constants/defaultToolConfig.ts` for complete default configuration:

```typescript
{
  display: {
    defaultCollapsed: true,
    jsonMaxDepth: 5,
    jsonMaxLength: 1000,
    showTimestamp: true,
    showDuration: true,
    jsonTheme: 'dark',
    statusColors: {
      pending: '#64748b',
      running: '#3b82f6',
      success: '#22c55e',
      error: '#ef4444',
    },
  },
  enableRemoteConfig: true,
  configApiEndpoint: '/api/tool-config',
  cacheDuration: 300000,  // 5 minutes
}
```

---

## Usage Examples

### Example 1: Basic Usage

```typescript
import { useToolConfig } from '@/hooks/useToolConfig';

function ToolSettings() {
  const { config, updateConfig, saveConfig } = useToolConfig();

  const handleToggleCollapse = () => {
    updateConfig({
      display: {
        defaultCollapsed: !config.display.defaultCollapsed,
      },
    });
  };

  const handleSave = async () => {
    try {
      await saveConfig({
        display: {
          defaultCollapsed: false,
        },
      });
      alert('Configuration saved!');
    } catch (error) {
      alert('Failed to save configuration');
    }
  };

  return (
    <div>
      <button onClick={handleToggleCollapse}>
        Toggle Default Collapsed
      </button>
      <button onClick={handleSave}>
        Save to Server
      </button>
    </div>
  );
}
```

### Example 2: Display Component

```typescript
import { SafeToolCallBlock } from '@/components/chat/message/ToolCallBlock';
import type { ToolCallBlock } from '@/workbench/types/content-block';

function ToolDisplay({ block }: { block: ToolCallBlock }) {
  return (
    <SafeToolCallBlock
      block={block}
      isUserMessage={false}
    />
  );
}
```

---

## See Also

- [Type Definitions](../../src/types/toolConfig.ts)
- [Default Configuration](../../src/constants/defaultToolConfig.ts)
- [API Implementation](../../src/api/config.ts)
- [Service Layer](../../src/services/toolConfigService.ts)
- [React Hook](../../src/hooks/useToolConfig.ts)
- [UI Component](../../src/components/chat/message/ToolCallBlock.tsx)
