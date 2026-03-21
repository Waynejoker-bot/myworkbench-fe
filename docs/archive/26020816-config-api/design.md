# 配置 API 设计文档

## 需求背景

前端需要从后端获取工具展示配置，用于控制聊天消息中工具调用结果的展示方式。这个接口需要完善的错误处理机制，确保在任何异常情况下都不影响消息的正常渲染。

## 设计目标

1. **灵活的配置系统** - 支持工具显示名称、图标、颜色等配置
2. **健壮的错误处理** - 处理 404、超时、空数据等所有异常情况
3. **零影响兜底** - 无论接口状态如何，都不影响消息渲染
4. **类型安全** - 提供完整的 TypeScript 类型定义
5. **可扩展性** - 易于添加新的配置项

## 技术方案

### 1. API 接口设计

#### 接口路径
```
GET /api/tools/config
```

#### 响应格式
```typescript
{
  tools: {
    [toolName: string]: {
      displayName?: string;      // 显示名称
      icon?: string;              // 图标 (emoji 或 icon name)
      color?: string;             // 颜色主题
      description?: string;       // 工具描述
      category?: string;          // 分类
      showResult?: boolean;       // 是否显示结果
      resultFormat?: 'json' | 'markdown' | 'text'; // 结果格式
    }
  };
  version: string;                // 配置版本
  updatedAt: string;              // 更新时间
}
```

### 2. 前端实现架构

```
src/
├── api/
│   └── config.ts                 # 配置 API 调用
├── constants/
│   └── defaultToolConfig.ts      # 默认配置常量
├── services/
│   └── toolConfigService.ts      # 配置服务（带缓存和兜底）
└── types/
    └── toolConfig.ts             # TypeScript 类型定义
```

### 3. 错误处理策略

#### 分层兜底机制

1. **API 层兜底** - 接口失败时返回空配置
2. **Service 层兜底** - 使用本地默认配置合并
3. **使用层兜底** - 组件中使用硬编码默认值

#### 错误场景处理

| 场景 | 处理方式 | 日志级别 |
|------|---------|---------|
| 接口 404 | 使用默认配置 | WARN |
| 接口超时 | 使用默认配置 | ERROR |
| 返回格式错误 | 使用默认配置 | ERROR |
| 网络错误 | 使用默认配置 + 重试 | WARN |
| 返回空数据 | 使用默认配置 | INFO |

### 4. 缓存策略

- **内存缓存**: 5分钟有效期
- **LocalStorage 缓存**: 1小时有效期
- **版本控制**: 通过 `version` 字段判断配置是否更新

### 5. 默认配置

提供常见工具的默认配置：

```typescript
const DEFAULT_TOOL_CONFIG = {
  'bash': {
    displayName: '命令行',
    icon: '⌨️',
    color: '#2ecc71',
    category: 'system',
  },
  'file-browser': {
    displayName: '文件浏览器',
    icon: '📁',
    color: '#3498db',
    category: 'system',
  },
  'web-search': {
    displayName: '网络搜索',
    icon: '🔍',
    color: '#9b59b6',
    category: 'information',
  },
  // ... 更多工具
};
```

## API 文档示例

### 请求示例

```typescript
const config = await getToolConfig();
// 或带缓存
const config = await toolConfigService.getConfig();
```

### 响应示例

**成功响应**:
```json
{
  "tools": {
    "bash": {
      "displayName": "命令行工具",
      "icon": "⌨️",
      "color": "#2ecc71",
      "description": "执行系统命令",
      "category": "system",
      "showResult": true,
      "resultFormat": "text"
    },
    "file-browser": {
      "displayName": "文件浏览器",
      "icon": "📁",
      "color": "#3498db",
      "category": "system"
    }
  },
  "version": "1.0.0",
  "updatedAt": "2026-02-08T12:00:00Z"
}
```

**错误响应** (不影响前端，使用默认配置):
```json
{
  "error": "Configuration not found"
}
```

## 使用示例

### 在组件中使用

```tsx
import { toolConfigService } from '@/services/toolConfigService';

function ToolCallItem({ toolName }) {
  const config = toolConfigService.getToolConfig(toolName);

  return (
    <div style={{ color: config.color }}>
      <span>{config.icon}</span>
      <span>{config.displayName}</span>
    </div>
  );
}
```

### React Hook

```tsx
function useToolConfig(toolName: string) {
  const [config, setConfig] = useState(() =>
    toolConfigService.getToolConfig(toolName)
  );

  useEffect(() => {
    // 监听配置更新
    const unsubscribe = toolConfigService.subscribe((newConfig) => {
      setConfig(toolConfigService.getToolConfig(toolName));
    });

    return unsubscribe;
  }, [toolName]);

  return config;
}
```

## 后端实现建议

### Python FastAPI 示例

```python
from fastapi import FastAPI
from datetime import datetime

app = FastAPI()

@app.get("/api/tools/config")
async def get_tools_config():
    """获取工具配置"""
    return {
        "tools": {
            "bash": {
                "displayName": "命令行工具",
                "icon": "⌨️",
                "color": "#2ecc71",
                "category": "system"
            },
            # 更多工具配置
        },
        "version": "1.0.0",
        "updatedAt": datetime.utcnow().isoformat() + "Z"
    }
```

### 数据库存储方案

```sql
CREATE TABLE tool_configs (
    tool_name VARCHAR(100) PRIMARY KEY,
    display_name VARCHAR(200),
    icon VARCHAR(50),
    color VARCHAR(20),
    description TEXT,
    category VARCHAR(50),
    show_result BOOLEAN DEFAULT TRUE,
    result_format VARCHAR(20) DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 测试计划

1. **单元测试**: 测试配置服务的各种错误场景
2. **集成测试**: 测试 API 调用和缓存逻辑
3. **E2E 测试**: 测试消息渲染不受配置接口影响
4. **性能测试**: 测试缓存命中率

## 安全考虑

1. 配置数据不包含敏感信息
2. 接口可以不需要认证（公开配置）
3. 限制配置项数量，防止滥用
4. 输入验证防止 XSS

## 未来扩展

1. **用户自定义配置** - 允许用户覆盖默认配置
2. **A/B 测试** - 支持不同配置变体
3. **动态更新** - WebSocket 推送配置变更
4. **配置导入导出** - 支持配置备份和迁移
