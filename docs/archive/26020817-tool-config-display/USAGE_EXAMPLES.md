# 工具配置显示功能 - 使用示例

## 示例 1: 基础使用 - 在组件中使用配置 Hook

```typescript
import { useToolConfig } from '@/hooks/useToolConfig';

function ToolSettingsPanel() {
  const {
    config,
    displayConfig,
    isLoading,
    error,
    updateConfig,
    saveConfig,
    resetToDefaults,
  } = useToolConfig({
    autoFetch: true,
  });

  if (isLoading) {
    return <div>加载配置中...</div>;
  }

  if (error) {
    return <div>加载失败: {error.message}</div>;
  }

  return (
    <div>
      <h2>工具显示设置</h2>

      <label>
        <input
          type="checkbox"
          checked={displayConfig.defaultCollapsed}
          onChange={(e) =>
            updateConfig({
              display: { defaultCollapsed: e.target.checked },
            })
          }
        />
        默认折叠工具调用
      </label>

      <label>
        JSON 最大深度:
        <input
          type="number"
          value={displayConfig.jsonMaxDepth}
          onChange={(e) =>
            updateConfig({
              display: { jsonMaxDepth: Number(e.target.value) },
            })
          }
          min={1}
          max={10}
        />
      </label>

      <button onClick={() => saveConfig(config)}>
        保存到服务器
      </button>

      <button onClick={resetToDefaults}>
        重置为默认值
      </button>
    </div>
  );
}
```

## 示例 2: 使用简化 Hook

```typescript
import { useToolDisplayConfig } from '@/hooks/useToolConfig';

function ToolCallDisplay() {
  const displayConfig = useToolDisplayConfig();

  return (
    <div>
      <p>默认状态: {displayConfig.defaultCollapsed ? '折叠' : '展开'}</p>
      <p>JSON 主题: {displayConfig.jsonTheme}</p>
    </div>
  );
}
```

## 示例 3: 手动控制配置服务

```typescript
import { getToolConfigService } from '@/services/toolConfigService';

async function manuallyUpdateConfig() {
  const service = getToolConfigService();

  // 获取当前配置
  const currentConfig = service.getConfig();

  // 更新配置
  service.updateConfig({
    display: {
      defaultCollapsed: false,
      jsonMaxLength: 2000,
    },
  });

  // 保存到服务器
  await service.saveConfig({
    config: currentConfig,
    persist: true,
  });

  // 订阅配置变化
  const unsubscribe = service.subscribe((config) => {
    console.log('配置已更新:', config);
  });

  // 稍后取消订阅
  // unsubscribe();
}
```

## 示例 4: 直接使用 API

```typescript
import {
  loadToolConfig,
  updateToolConfig,
  clearToolConfigCache,
} from '@/api/config';

async function loadAndModifyConfig() {
  // 加载配置（带缓存）
  const config = await loadToolConfig();

  console.log('当前配置:', config);

  // 强制刷新
  const freshConfig = await loadToolConfig(true);

  // 更新配置
  await updateToolConfig({
    config: {
      display: {
        defaultCollapsed: false,
      },
    },
    persist: true,
  });

  // 清除缓存
  clearToolConfigCache();
}
```

## 示例 5: 在消息组件中使用工具调用块

```typescript
import { SafeToolCallBlock } from '@/components/chat/message/ToolCallBlock';
import type { ToolCallBlock } from '@/workbench/types/content-block';

function MessageWithToolCall() {
  const toolCallBlock: ToolCallBlock = {
    type: 'tool_call',
    id: 'tool-1',
    toolName: 'web_search',
    parameters: {
      query: 'TypeScript tutorial',
      limit: 10,
    },
    status: 'success',
    result: {
      results: [
        { title: 'TypeScript Tutorial', url: 'https://example.com' },
      ],
    },
  };

  return (
    <div className="message">
      <SafeToolCallBlock block={toolCallBlock} />
    </div>
  );
}
```

## 示例 6: 自定义工具注册表

```typescript
import { getToolMetadata } from '@/constants/defaultToolConfig';

// 获取工具元数据
const metadata = getToolMetadata('web_search');

console.log(metadata.displayName);  // "网络搜索"
console.log(metadata.iconName);     // "Search"
console.log(metadata.category);     // "search"

// 扩展工具注册表
import { DEFAULT_TOOL_REGISTRY } from '@/constants/defaultToolConfig';

const customRegistry = {
  ...DEFAULT_TOOL_REGISTRY,
  'my_custom_tool': {
    displayName: '我的自定义工具',
    description: '这是一个自定义工具',
    iconName: 'Star',
    category: 'custom',
    dangerous: false,
  },
};

const customToolMetadata = getToolMetadata('my_custom_tool', customRegistry);
```

## 示例 7: 错误处理

```typescript
import { useToolConfig } from '@/hooks/useToolConfig';
import { fetchToolConfig } from '@/api/config';

function RobustConfigLoader() {
  const { config, error, isLoading, refetch } = useToolConfig({
    autoFetch: true,
  });

  const handleRetry = async () => {
    try {
      await refetch();
    } catch (err) {
      console.error('重试失败:', err);
      // 使用默认配置作为降级
      console.log('使用默认配置');
    }
  };

  if (isLoading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return (
      <div>
        <p>加载失败: {error.message}</p>
        <p>使用默认配置</p>
        <button onClick={handleRetry}>重试</button>
      </div>
    );
  }

  return <div>配置已加载</div>;
}

// 直接使用 API 的错误处理
async function safeConfigFetch() {
  try {
    const response = await fetchToolConfig();
    // API 内部会自动降级到默认配置，所以这里总是会成功
    console.log('配置:', response.config);
  } catch (error) {
    // 这个 catch 块通常不会执行，因为 API 内部已经处理了错误
    console.error('不应到达这里:', error);
  }
}
```

## 示例 8: 跨标签页配置同步

```typescript
import { subscribeToToolConfigChanges } from '@/api/config';

// 在标签页 A 中更新配置
async function updateConfigInTabA() {
  const { updateToolConfig } = await import('@/api/config');
  await updateToolConfig({
    config: { display: { defaultCollapsed: false } },
    persist: true,
  });
}

// 在标签页 B 中监听变化
function listenInTabB() {
  const unsubscribe = subscribeToToolConfigChanges((config) => {
    console.log('配置在其他标签页中更新:', config);
    // 更新 UI
  });

  // 组件卸载时取消订阅
  return () => unsubscribe();
}
```

## 示例 9: 配置验证

```typescript
import { validateToolConfig } from '@/api/config';

function validateMyConfig() {
  const myConfig = {
    display: {
      jsonMaxDepth: 15,  // 无效：超过 10
      jsonMaxLength: 50, // 警告：小于 100
    },
  };

  const result = validateToolConfig(myConfig);

  if (!result.valid) {
    console.error('配置无效:', result.errors);
    // ["jsonMaxDepth must be between 1 and 10"]
  }

  if (result.warnings.length > 0) {
    console.warn('配置警告:', result.warnings);
    // ["jsonMaxLength should be between 100 and 10000"]
  }
}
```

## 示例 10: 性能优化 - 非响应式访问

```typescript
import { useToolConfigStatic } from '@/hooks/useToolConfig';

// 对于频繁渲染的组件，使用非响应式访问避免不必要的重渲染
function FrequentlyRerenderingComponent() {
  const config = useToolConfigStatic();

  // config 的变化不会触发组件重渲染
  // 适用于在事件处理器中使用
  const handleClick = () => {
    console.log('当前配置:', config);
  };

  return <button onClick={handleClick}>查看配置</button>;
}
```

## 完整示例: 工具配置管理页面

```typescript
import { useState } from 'react';
import { useToolConfig } from '@/hooks/useToolConfig';
import { ToolExecutionStatus } from '@/types/toolConfig';

export function ToolConfigPage() {
  const {
    config,
    displayConfig,
    isLoading,
    error,
    updateConfig,
    saveConfig,
    resetToDefaults,
  } = useToolConfig({ autoFetch: true });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      await saveConfig(config);
      setSaveMessage('保存成功！');
    } catch (err) {
      setSaveMessage('保存失败: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('确定要重置为默认配置吗？')) {
      resetToDefaults();
      setSaveMessage('已重置为默认配置');
    }
  };

  if (isLoading) {
    return <div className="loading">加载配置中...</div>;
  }

  return (
    <div className="tool-config-page">
      <h1>工具配置管理</h1>

      {error && (
        <div className="error-banner">
          加载配置失败，使用默认配置
        </div>
      )}

      {saveMessage && (
        <div className="save-message">{saveMessage}</div>
      )}

      <div className="config-section">
        <h2>显示设置</h2>

        <ConfigItem
          label="默认折叠"
          type="checkbox"
          value={displayConfig.defaultCollapsed}
          onChange={(value) =>
            updateConfig({ display: { defaultCollapsed: value } })
          }
        />

        <ConfigItem
          label="JSON 最大深度"
          type="number"
          value={displayConfig.jsonMaxDepth}
          onChange={(value) =>
            updateConfig({ display: { jsonMaxDepth: value } })
          }
          min={1}
          max={10}
        />

        <ConfigItem
          label="JSON 最大长度"
          type="number"
          value={displayConfig.jsonMaxLength}
          onChange={(value) =>
            updateConfig({ display: { jsonMaxLength: value } })
          }
          min={100}
          max={10000}
        />

        <ConfigItem
          label="显示时间戳"
          type="checkbox"
          value={displayConfig.showTimestamp}
          onChange={(value) =>
            updateConfig({ display: { showTimestamp: value } })
          }
        />

        <ConfigItem
          label="JSON 主题"
          type="select"
          value={displayConfig.jsonTheme}
          onChange={(value) =>
            updateConfig({ display: { jsonTheme: value } })
          }
          options={[
            { value: 'light', label: '浅色' },
            { value: 'dark', label: '深色' },
          ]}
        />
      </div>

      <div className="config-section">
        <h2>状态颜色</h2>

        {Object.values(ToolExecutionStatus).map((status) => (
          <ColorPicker
            key={status}
            label={status}
            value={displayConfig.statusColors[status]}
            onChange={(color) =>
              updateConfig({
                display: {
                  statusColors: {
                    ...displayConfig.statusColors,
                    [status]: color,
                  },
                },
              })
            }
          />
        ))}
      </div>

      <div className="actions">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="primary-button"
        >
          {isSaving ? '保存中...' : '保存配置'}
        </button>

        <button
          onClick={handleReset}
          className="secondary-button"
        >
          重置为默认
        </button>
      </div>
    </div>
  );
}

// 辅助组件
function ConfigItem({
  label,
  type,
  value,
  onChange,
  min,
  max,
  options,
}: any) {
  return (
    <div className="config-item">
      <label>{label}</label>
      {type === 'checkbox' && (
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
      )}
      {type === 'number' && (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
        />
      )}
      {type === 'select' && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt: any) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function ColorPicker({ label, value, onChange }: any) {
  return (
    <div className="color-picker">
      <label>{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="color-value">{value}</span>
    </div>
  );
}
```

这些示例展示了工具配置显示功能的各种使用方式，从简单的配置读取到复杂的配置管理页面。
