import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Play, Pause, BookOpen, Clock, FileText, ChevronRight } from "lucide-react";
import { useBookshelf } from "@/hooks/useNovel";
import type { NovelMeta, Chapter } from "@/types/novel";

/** 小说（含最新章节信息） */
interface NovelWithLatestChapter extends NovelMeta {
  latestChapter?: Chapter;
}

/** 获取单本小说的最新章节 */
async function fetchLatestChapter(bookId: string): Promise<Chapter | undefined> {
  try {
    const response = await fetch(`/novels/${bookId}/meta.json`);
    if (!response.ok) return undefined;
    const data = await response.json();
    const chapters = data.chapters as Chapter[];
    if (!chapters || chapters.length === 0) return undefined;
    // 返回最后一章
    return chapters[chapters.length - 1];
  } catch {
    return undefined;
  }
}

function HomePage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [novels, setNovels] = useState<NovelWithLatestChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const { bookshelf } = useBookshelf();

  // 加载所有小说及其最新章节
  useEffect(() => {
    if (!bookshelf?.novels) return;

    const loadNovels = async () => {
      setLoading(true);
      const novelsWithChapters = await Promise.all(
        bookshelf.novels.map(async (novel) => {
          const latestChapter = await fetchLatestChapter(novel.id);
          return { ...novel, latestChapter };
        })
      );
      setNovels(novelsWithChapters);
      setLoading(false);
    };

    loadNovels();
  }, [bookshelf]);

  // 孙燕姿歌曲链接
  const songUrl = "/同类.mp3";

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // 自动播放可能被浏览器阻止
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 relative">
      {songUrl && (
        <audio
          ref={audioRef}
          src={songUrl}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Vinyl Record Player - Fixed Top Right */}
      <div className="fixed top-8 right-8 z-50">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            {/* Vinyl Record */}
            <div className="relative w-14 h-14">
              <div
                className={`absolute inset-0 rounded-full ${isPlaying ? 'vinyl-spin' : ''}`}
                style={{
                  background: `
                    repeating-radial-gradient(
                      circle at center,
                      transparent 0px,
                      transparent 1.5px,
                      rgba(60, 60, 60, 0.15) 1.5px,
                      rgba(60, 60, 60, 0.15) 2.5px
                    ),
                    linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)
                  `
                }}
              >
                {/* Highlight/shine effect */}
                <div className="absolute inset-0 rounded-full opacity-20">
                  <div className="absolute top-1 left-1 w-6 h-6 bg-white/20 rounded-full blur-sm" />
                </div>
                {/* Center label */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-slate-600" />
                </div>
              </div>
            </div>

            {/* Song Info & Controls */}
            <div className="flex flex-col gap-1">
              <div className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
                同类
              </div>
              <div className="text-[9px] text-slate-500 dark:text-slate-500">
                孙燕姿
              </div>
              <button
                onClick={songUrl ? togglePlay : undefined}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors self-start mt-0.5"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <Link to="/chat" className="block w-24 h-24 relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg cursor-pointer group-hover:avatar-heartbeat transition-shadow">
                <img src="/head/head.png" alt="avatar" className="w-full h-full object-cover" />
              </div>
            </Link>
            {/* 隐蔽的文件系统入口 */}
            <Link
              to="/fs"
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              title="文件系统"
            >
              <span className="text-xs text-slate-500 dark:text-slate-400">⚙</span>
            </Link>
          </div>
          <h1 className="text-3xl font-bold mb-3 text-slate-900 dark:text-slate-100">
            铜声瘦骨
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            人穷马瘦剑术疏，天寒路远雪塞途。
            <br />
            长啸一声溯风去，人生何处不江湖。
          </p>
        </header>

        <Separator className="mb-12" />

        {/* About */}
        <section className="mb-12">
          <Card className="border-none shadow-sm bg-white/50 dark:bg-slate-800/50">
            <CardContent className="p-8">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                行路多年，渐觉少即是多。
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Novel Entries - 小说入口列表 */}
        <section className="mb-12">
          {loading ? (
            <Card className="border-none shadow-sm bg-white/50 dark:bg-slate-800/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-slate-400">
                  <BookOpen className="w-5 h-5 animate-pulse" />
                  <span className="text-sm">加载中...</span>
                </div>
              </CardContent>
            </Card>
          ) : novels.length > 0 ? (
            <div className="space-y-4">
              {novels.map((novel) => (
                <Link key={novel.id} to={`/novel/${novel.id}`} className="block group">
                  <Card className="border-none shadow-sm bg-white/50 dark:bg-slate-800/50
                                  hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors cursor-pointer overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        {/* 封面 */}
                        <div className="w-full sm:w-28 flex-shrink-0">
                          <div className="aspect-[3/2] sm:aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
                            {novel.cover ? (
                              <img
                                src={novel.cover}
                                alt={novel.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 信息 */}
                        <div className="p-4 flex-1">
                          <div className="flex items-start justify-between mb-1.5">
                            <h3 className="text-base font-medium text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                              {novel.title}
                            </h3>
                            {novel.status === 'ongoing' ? (
                              <span className="px-2 py-0.5 text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                                连载中
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full">
                                已完结
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                            {novel.author}
                          </p>

                          {/* 最新章节 */}
                          {novel.latestChapter && (
                            <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-600 dark:text-slate-300">
                              <span className="text-slate-400 dark:text-slate-500">最新：</span>
                              <span className="truncate">{novel.latestChapter.title}</span>
                              <ChevronRight className="w-3 h-3 text-slate-400" />
                            </div>
                          )}

                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3 line-clamp-2">
                            {novel.description}
                          </p>

                          {/* 统计 */}
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {novel.chapterCount} 章
                            </span>
                            {novel.wordCount && (
                              <span>
                                {novel.wordCount >= 10000
                                  ? `${(novel.wordCount / 10000).toFixed(1)} 万字`
                                  : `${novel.wordCount} 字`}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {novel.updatedAt}
                            </span>
                          </div>

                          {/* 标签 */}
                          {novel.tags && novel.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {novel.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 text-[10px] bg-slate-100/80 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-none shadow-sm bg-white/50 dark:bg-slate-800/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-slate-400">
                  <BookOpen className="w-5 h-5" />
                  <span className="text-sm">暂无作品</span>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Notes */}
        <section>
          <Card className="border-none shadow-sm bg-white/50 dark:bg-slate-800/50">
            <CardContent className="p-6">
              <p className="text-slate-500 dark:text-slate-500 text-xs leading-relaxed">
                有些文字，会慢慢写。
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="mt-16 text-center text-slate-500 dark:text-slate-400 text-xs">
          <p>Work in progress</p>
        </footer>
      </div>
    </div>
  );
}

export default HomePage;
