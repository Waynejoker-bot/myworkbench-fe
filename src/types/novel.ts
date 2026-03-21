/**
 * 小说相关类型定义
 */

/** 小说元信息 */
export interface NovelMeta {
  /** 小说唯一标识 */
  id: string;
  /** 书名 */
  title: string;
  /** 作者 */
  author: string;
  /** 封面图片路径（可选） */
  cover?: string;
  /** 简介 */
  description: string;
  /** 章节数量 */
  chapterCount: number;
  /** 总字数（可选） */
  wordCount?: number;
  /** 连载状态：ongoing-连载中, completed-已完结 */
  status: 'ongoing' | 'completed';
  /** 创建时间 */
  createdAt: string;
  /** 最后更新时间 */
  updatedAt: string;
  /** 标签（可选） */
  tags?: string[];
}

/** 章节信息 */
export interface Chapter {
  /** 章节唯一标识 */
  id: string;
  /** 所属小说 ID */
  bookId: string;
  /** 章节标题 */
  title: string;
  /** 章节序号（从 1 开始） */
  order: number;
  /** 章节字数（可选） */
  wordCount?: number;
  /** 创建时间 */
  createdAt: string;
}

/** 章节内容（包含正文） */
export interface ChapterContent extends Chapter {
  /** 章节正文（Markdown 格式） */
  content: string;
}

/** 小说详情（包含元信息和章节列表） */
export interface NovelDetail extends NovelMeta {
  /** 章节列表 */
  chapters: Chapter[];
}

/** 书架数据 */
export interface Bookshelf {
  /** 所有小说列表 */
  novels: NovelMeta[];
}

/** 阅读器设置 */
export interface ReaderSettings {
  /** 字体大小 */
  fontSize: 'small' | 'medium' | 'large';
  /** 主题模式 */
  theme: 'light' | 'dark' | 'sepia';
}

/** 阅读器字体大小映射 */
export const FONT_SIZE_MAP: Record<ReaderSettings['fontSize'], string> = {
  small: 'text-base leading-relaxed',      // 16px
  medium: 'text-lg leading-relaxed',       // 18px
  large: 'text-xl leading-loose',          // 20px
};

/** 阅读器主题样式映射 */
export const THEME_MAP: Record<ReaderSettings['theme'], { bg: string; text: string }> = {
  light: {
    bg: 'bg-white dark:bg-slate-50',
    text: 'text-slate-800',
  },
  dark: {
    bg: 'bg-slate-900',
    text: 'text-slate-200',
  },
  sepia: {
    bg: 'bg-amber-50',
    text: 'text-amber-900',
  },
};
