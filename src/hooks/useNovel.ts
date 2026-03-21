import { useState, useEffect, useCallback } from 'react';
import type { Bookshelf, NovelDetail, Chapter, ChapterContent } from '@/types/novel';

// 小说数据 API 基础路径（运行时加载，支持独立更新）
const NOVEL_API_BASE = '/novels';

/**
 * 获取书架数据（所有小说列表）
 */
export function useBookshelf() {
  const [bookshelf, setBookshelf] = useState<Bookshelf | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadBookshelf = async () => {
      try {
        const response = await fetch(`${NOVEL_API_BASE}/index.json`);
        if (!response.ok) {
          throw new Error('加载书架失败');
        }
        const data = await response.json();
        setBookshelf(data as Bookshelf);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('加载书架失败'));
      } finally {
        setLoading(false);
      }
    };

    loadBookshelf();
  }, []);

  return { bookshelf, loading, error };
}

/**
 * 获取单本小说详情（包含章节列表）
 */
export function useNovelDetail(bookId: string) {
  const [novel, setNovel] = useState<NovelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadNovel = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${NOVEL_API_BASE}/${bookId}/meta.json`);
        if (!response.ok) {
          throw new Error('小说不存在');
        }
        const data = await response.json();
        setNovel(data as NovelDetail);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('小说不存在'));
        setNovel(null);
      } finally {
        setLoading(false);
      }
    };

    if (bookId) {
      loadNovel();
    }
  }, [bookId]);

  return { novel, loading, error };
}

/**
 * 获取章节内容
 */
export function useChapterContent(bookId: string, chapterId: string) {
  const [chapter, setChapter] = useState<ChapterContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadChapter = async () => {
      setLoading(true);
      setError(null);

      try {
        // 先获取章节元数据
        const metaResponse = await fetch(`${NOVEL_API_BASE}/${bookId}/meta.json`);
        if (!metaResponse.ok) {
          throw new Error('小说不存在');
        }
        const novelDetail = await metaResponse.json() as NovelDetail;
        const chapterMeta = novelDetail.chapters.find(c => c.id === chapterId);

        if (!chapterMeta) {
          throw new Error('章节不存在');
        }

        // 获取章节内容（原始 Markdown）
        const contentResponse = await fetch(`${NOVEL_API_BASE}/${bookId}/chapters/${chapterId}.md`);
        if (!contentResponse.ok) {
          throw new Error('章节内容加载失败');
        }
        const content = await contentResponse.text();

        setChapter({
          ...chapterMeta,
          content,
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('加载失败'));
        setChapter(null);
      } finally {
        setLoading(false);
      }
    };

    if (bookId && chapterId) {
      loadChapter();
    }
  }, [bookId, chapterId]);

  return { chapter, loading, error };
}

/**
 * 获取相邻章节信息
 */
export function useAdjacentChapters(bookId: string, currentOrder: number) {
  const [prev, setPrev] = useState<Chapter | null>(null);
  const [next, setNext] = useState<Chapter | null>(null);

  useEffect(() => {
    const loadAdjacent = async () => {
      try {
        const response = await fetch(`${NOVEL_API_BASE}/${bookId}/meta.json`);
        if (!response.ok) {
          throw new Error('加载失败');
        }
        const novelDetail = await response.json() as NovelDetail;
        const chapters = novelDetail.chapters;

        setPrev(chapters.find(c => c.order === currentOrder - 1) || null);
        setNext(chapters.find(c => c.order === currentOrder + 1) || null);
      } catch {
        setPrev(null);
        setNext(null);
      }
    };

    if (bookId && currentOrder > 0) {
      loadAdjacent();
    }
  }, [bookId, currentOrder]);

  return { prev, next };
}

/**
 * 获取小说的所有章节列表（用于目录）
 */
export function useNovelChapters(bookId: string) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChapters = async () => {
      try {
        const response = await fetch(`${NOVEL_API_BASE}/${bookId}/meta.json`);
        if (!response.ok) {
          throw new Error('加载失败');
        }
        const novelDetail = await response.json() as NovelDetail;
        setChapters(novelDetail.chapters);
      } catch {
        setChapters([]);
      } finally {
        setLoading(false);
      }
    };

    if (bookId) {
      loadChapters();
    }
  }, [bookId]);

  return { chapters, loading };
}

/**
 * 阅读器设置 Hook
 */
export function useReaderSettings() {
  type FontSize = 'small' | 'medium' | 'large';
  type Theme = 'light' | 'dark' | 'sepia';

  const [settings, setSettings] = useState<{
    fontSize: FontSize;
    theme: Theme;
  }>({
    fontSize: 'medium',
    theme: 'light',
  });

  // 字体大小切换
  const cycleFontSize = useCallback(() => {
    setSettings(prev => {
      const sizeMap: Record<FontSize, FontSize> = {
        small: 'medium',
        medium: 'large',
        large: 'small',
      };
      return { ...prev, fontSize: sizeMap[prev.fontSize] };
    });
  }, []);

  // 主题切换
  const cycleTheme = useCallback(() => {
    setSettings(prev => {
      const themeMap: Record<Theme, Theme> = {
        light: 'dark',
        dark: 'sepia',
        sepia: 'light',
      };
      return { ...prev, theme: themeMap[prev.theme] };
    });
  }, []);

  return {
    settings,
    cycleFontSize,
    cycleTheme,
  };
}
