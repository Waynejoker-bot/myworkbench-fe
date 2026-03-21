import { Link } from 'react-router-dom';
import { Book, Clock, FileText } from 'lucide-react';
import { useBookshelf } from '@/hooks/useNovel';
import type { NovelMeta } from '@/types/novel';

/**
 * 书籍卡片组件
 */
function BookCard({ novel }: { novel: NovelMeta }) {
  return (
    <Link
      to={`/novel/${novel.id}`}
      className="group block"
    >
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl overflow-hidden shadow-sm
                      hover:shadow-md transition-all duration-300 border border-slate-100 dark:border-slate-700/50
                      hover:border-slate-200 dark:hover:border-slate-600">
        {/* 封面区域 */}
        <div className="aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800
                        relative overflow-hidden">
          {novel.cover ? (
            <img
              src={novel.cover}
              alt={novel.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Book className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            </div>
          )}
          {/* 状态标签 */}
          {novel.status === 'ongoing' && (
            <div className="absolute top-3 right-3 px-2 py-0.5 bg-emerald-500/90 text-white text-xs rounded-full">
              连载中
            </div>
          )}
        </div>

        {/* 信息区域 */}
        <div className="p-4">
          <h3 className="font-medium text-slate-800 dark:text-slate-100 mb-1 truncate">
            {novel.title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            {novel.author}
          </p>

          {/* 简介 */}
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
            {novel.description}
          </p>

          {/* 统计信息 */}
          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {novel.chapterCount} 章
            </span>
            {novel.wordCount && (
              <span>{(novel.wordCount / 1000).toFixed(1)} 万字</span>
            )}
          </div>

          {/* 更新时间 */}
          <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-2">
            <Clock className="w-3 h-3" />
            <span>更新于 {novel.updatedAt}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * 书架页面
 */
function BookshelfPage() {
  const { bookshelf, loading, error } = useBookshelf();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-slate-50 to-emerald-50/30 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-slate-400 dark:text-slate-500">加载中...</div>
      </div>
    );
  }

  if (error || !bookshelf) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-slate-50 to-emerald-50/30 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400">{error?.message || '加载失败'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-slate-50 to-emerald-50/30 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        {/* 页头 */}
        <header className="text-center mb-12">
          <Link to="/" className="inline-block mb-6">
            <div className="w-12 h-12 mx-auto rounded-full overflow-hidden shadow-md
                            bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800
                            flex items-center justify-center">
              <img src="/head/head.png" alt="avatar" className="w-full h-full object-cover" />
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
            书架
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            这里收藏着一些文字，它们关于山川、关于岁月、关于那些平凡却珍贵的时光。
          </p>
        </header>

        {/* 书籍列表 */}
        {bookshelf.novels.length === 0 ? (
          <div className="text-center py-16">
            <Book className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-400 dark:text-slate-500">书架空空如也，还在努力创作中...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookshelf.novels.map(novel => (
              <BookCard key={novel.id} novel={novel} />
            ))}
          </div>
        )}

        {/* 页脚 */}
        <footer className="mt-16 text-center">
          <Link
            to="/"
            className="text-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            ← 返回首页
          </Link>
        </footer>
      </div>
    </div>
  );
}

export default BookshelfPage;
