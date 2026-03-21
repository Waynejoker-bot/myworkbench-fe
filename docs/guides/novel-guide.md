# 小说管理指南

本文档说明如何在 MyWorkbench 中添加新的小说和章节内容。

## 架构说明

小说数据采用**独立部署**方案，与前端代码分离，支持单独更新小说内容而无需重新构建前端。

```
/opt/novels/                    # 小说数据目录（独立部署，Nginx 直接服务）
├── index.json                  # 小说索引
└── {book-id}/                  # 小说目录
    ├── meta.json               # 小说元信息
    ├── cover.jpg               # 封面图片（可选）
    └── chapters/               # 章节内容
        ├── chapter-01.md
        ├── chapter-02.md
        └── ...
```

**优势**：
- 更新小说内容无需重新构建前端
- 数据与代码分离，便于管理
- 支持独立备份和迁移

## Nginx 配置

小说数据通过 `/novels/` 路径访问，Nginx 配置示例：

```nginx
location /novels/ {
    alias /opt/novels/;
    default_type application/json;

    location ~ \.json$ {
        add_header Content-Type application/json;
        add_header Access-Control-Allow-Origin *;
    }

    location ~ \.md$ {
        add_header Content-Type text/plain;
        add_header Access-Control-Allow-Origin *;
    }

    location ~ \.(jpg|jpeg|png|gif|webp)$ {
        add_header Access-Control-Allow-Origin *;
    }
}
```

## 添加新小说

### 第一步：创建小说目录

```bash
mkdir -p /opt/novels/my-new-book/chapters
```

### 第二步：创建元信息文件

在 `/opt/novels/my-new-book/meta.json` 创建元信息：

```json
{
  "id": "my-new-book",
  "title": "新书名称",
  "author": "作者名",
  "cover": "/novels/my-new-book/cover.jpg",
  "description": "这是一本关于什么的小说，简短介绍一下...",
  "chapterCount": 3,
  "wordCount": 15000,
  "status": "ongoing",
  "createdAt": "2024-01-15",
  "updatedAt": "2024-06-20",
  "tags": ["奇幻", "冒险", "成长"],
  "chapters": [
    {
      "id": "chapter-01",
      "bookId": "my-new-book",
      "title": "第一章 序幕",
      "order": 1,
      "wordCount": 5000,
      "createdAt": "2024-01-15"
    },
    {
      "id": "chapter-02",
      "bookId": "my-new-book",
      "title": "第二章 启程",
      "order": 2,
      "wordCount": 4800,
      "createdAt": "2024-03-10"
    },
    {
      "id": "chapter-03",
      "bookId": "my-new-book",
      "title": "第三章 相遇",
      "order": 3,
      "wordCount": 5200,
      "createdAt": "2024-06-20"
    }
  ]
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 小说唯一标识，用于 URL 路由 |
| `title` | string | ✅ | 小说名称 |
| `author` | string | ✅ | 作者名 |
| `cover` | string | ❌ | 封面图片路径，格式为 `/novels/{book-id}/cover.jpg` |
| `description` | string | ✅ | 小说简介 |
| `chapterCount` | number | ✅ | 章节总数 |
| `wordCount` | number | ❌ | 总字数 |
| `status` | string | ✅ | 连载状态：`ongoing`(连载中) 或 `completed`(已完结) |
| `createdAt` | string | ✅ | 创建日期，格式 `YYYY-MM-DD` |
| `updatedAt` | string | ✅ | 最后更新日期 |
| `tags` | string[] | ❌ | 标签数组 |
| `chapters` | array | ✅ | 章节列表 |

**章节字段**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 章节唯一标识，如 `chapter-01` |
| `bookId` | string | ✅ | 所属小说 ID |
| `title` | string | ✅ | 章节标题 |
| `order` | number | ✅ | 章节序号，从 1 开始 |
| `wordCount` | number | ❌ | 章节字数 |
| `createdAt` | string | ❌ | 发布日期 |

### 第三步：添加章节内容

在 `/opt/novels/my-new-book/chapters/` 目录下创建 Markdown 文件：

**文件名**：`chapter-01.md`

```markdown
# 第一章 序幕

## 一

故事从一个风雨交加的夜晚开始。

窗外的雨点敲打着玻璃，发出细碎的声响。我坐在书桌前，翻看着那本泛黄的日记。

## 二

日记的扉页上写着一句话：

> 愿你出走半生，归来仍是少年。

那是外婆留给我的唯一遗物。

## 三

我轻轻合上日记，望向窗外。

雨，不知何时已经停了。远处的天空露出一线微光，像是黎明的预兆。

---

*（未完待续）*
```

**Markdown 写作建议**：

- 使用 `#` 作为章节标题
- 使用 `##` 作为小节标题
- 段落之间空一行
- 使用 `---` 作为分隔线
- 使用 `> ` 标记引用文字
- 使用 `*斜体*` 或 `**粗体**` 强调

### 第四步：更新小说索引

编辑 `/opt/novels/index.json`，添加新小说：

```json
{
  "novels": [
    {
      "id": "xue-ci",
      "title": "雪刺",
      "author": "铜声瘦骨",
      "description": "...",
      ...
    },
    {
      "id": "my-new-book",
      "title": "新书名称",
      "author": "作者名",
      "description": "这是一本关于什么的小说...",
      "chapterCount": 3,
      "wordCount": 15000,
      "status": "ongoing",
      "createdAt": "2024-01-15",
      "updatedAt": "2024-06-20",
      "tags": ["奇幻", "冒险"]
    }
  ]
}
```

### 第五步：添加封面（可选）

将封面图片放到 `/opt/novels/my-new-book/cover.jpg`，推荐尺寸：

- **比例**：3:4（竖版）
- **分辨率**：至少 300×400 像素
- **格式**：JPG 或 PNG

## 添加新章节

### 1. 创建章节文件

在 `/opt/novels/{book-id}/chapters/` 下创建新的 Markdown 文件，如 `chapter-04.md`。

### 2. 更新元信息

编辑 `/opt/novels/{book-id}/meta.json`：

- 在 `chapters` 数组中添加新章节信息
- 更新 `chapterCount`
- 更新 `wordCount`（如有）
- 更新 `updatedAt` 日期

### 3. 验证访问

更新完成后可直接访问验证：

```bash
# 验证元数据
curl https://your-domain.com/novels/my-new-book/meta.json

# 验证章节内容
curl https://your-domain.com/novels/my-new-book/chapters/chapter-04.md
```

## 访问路径

| 页面 | URL |
|------|-----|
| 书架 | `/novel` |
| 小说详情 | `/novel/{book-id}` |
| 章节阅读 | `/novel/{book-id}/{chapter-id}` |

**示例**：
- `/novel/xue-ci` - 查看《雪刺》的目录
- `/novel/xue-ci/chapter-01` - 阅读第一章

## 前端数据加载

前端通过 `useNovel` hooks 加载小说数据，所有数据均通过 fetch API 运行时获取：

```typescript
// hooks/useNovel.ts
const NOVEL_API_BASE = '/novels';

// 获取书架列表
fetch('/novels/index.json')

// 获取小说详情
fetch('/novels/{book-id}/meta.json')

// 获取章节内容
fetch('/novels/{book-id}/chapters/{chapter-id}.md')
```

## 注意事项

1. **ID 唯一性**：小说 ID 和章节 ID 必须全局唯一
2. **编码格式**：所有 JSON 和 Markdown 文件使用 UTF-8 编码
3. **日期格式**：统一使用 `YYYY-MM-DD` 格式
4. **即时生效**：修改 `/opt/novels/` 下的文件后直接生效，无需重新构建前端
5. **缓存**：如需强制刷新，可清除浏览器缓存或在 URL 后添加查询参数

## 示例小说

参考 `xue-ci`（雪刺）的完整实现：

```
/opt/novels/xue-ci/
├── meta.json           # 小说元信息
└── chapters/
    └── chapter-01.md   # 第一章 寒光平地起
```
