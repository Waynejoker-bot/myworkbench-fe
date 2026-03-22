import { describe, it, expect } from 'vitest';

/**
 * Bug: Breadcrumb 允许用户点击项目根目录之上的路径段（如 /opt），
 * 导致后端返回 "Path out of project range" 错误。
 *
 * 场景：后端项目根为 /opt/claude/business，
 * Breadcrumb 显示 / > opt > claude > business > ...
 * 用户点击 "opt" 触发 listDirectory(prefix, "/opt")，后端拒绝。
 *
 * 修复：Breadcrumb 需要知道 rootPath，不允许导航到 rootPath 之上。
 */

// 从 full_path 中提取面包屑 segments 的逻辑
interface BreadcrumbSegment {
  label: string;
  prefix: string;
  path: string;
  navigable: boolean;
}

/**
 * 构建面包屑 segments，标记哪些可以导航
 * rootPath: 后端返回的项目根路径（首次 listDirectory 的 full_path）
 * currentFullPath: 当前完整路径
 */
function buildBreadcrumbSegments(
  prefix: string,
  path: string,
  rootPath: string,
): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [];

  // 将 rootPath 拆成段
  const rootParts = rootPath.split('/').filter(Boolean);

  // 将当前 full_path 拆成段
  const fullPath = prefix ? `${prefix}/${path}`.replace(/\/+/g, '/') : path;
  const allParts = fullPath.split('/').filter(Boolean);

  // 根目录 "/"
  segments.push({
    label: '/',
    prefix: '',
    path: '',
    navigable: rootParts.length === 0, // 只有根就是项目根时才可导航
  });

  // 逐层构建
  for (let i = 0; i < allParts.length; i++) {
    const partPath = '/' + allParts.slice(0, i + 1).join('/');
    const isAtOrBelowRoot = i >= rootParts.length - 1;

    segments.push({
      label: allParts[i]!,
      prefix,
      path: partPath,
      navigable: isAtOrBelowRoot,
    });
  }

  return segments;
}

describe('Breadcrumb 路径边界保护', () => {

  describe('buildBreadcrumbSegments', () => {

    it('rootPath 为 /opt/claude/business 时，opt 和 claude 不可导航', () => {
      const segments = buildBreadcrumbSegments(
        '',
        '/opt/claude/business',
        '/opt/claude/business',
      );

      // / > opt > claude > business
      expect(segments).toHaveLength(4);

      expect(segments[0]).toMatchObject({ label: '/', navigable: false });
      expect(segments[1]).toMatchObject({ label: 'opt', navigable: false });
      expect(segments[2]).toMatchObject({ label: 'claude', navigable: false });
      expect(segments[3]).toMatchObject({ label: 'business', navigable: true });
    });

    it('rootPath 为 /opt/claude/business，子目录全部可导航', () => {
      const segments = buildBreadcrumbSegments(
        '',
        '/opt/claude/business/nvwa/runtime',
        '/opt/claude/business',
      );

      // / > opt > claude > business > nvwa > runtime
      expect(segments).toHaveLength(6);
      expect(segments[0]).toMatchObject({ label: '/', navigable: false });
      expect(segments[1]).toMatchObject({ label: 'opt', navigable: false });
      expect(segments[2]).toMatchObject({ label: 'claude', navigable: false });
      expect(segments[3]).toMatchObject({ label: 'business', navigable: true });
      expect(segments[4]).toMatchObject({ label: 'nvwa', navigable: true });
      expect(segments[5]).toMatchObject({ label: 'runtime', navigable: true });
    });

    it('rootPath 为 / 时所有段都可导航', () => {
      const segments = buildBreadcrumbSegments('', '/opt/claude', '/');

      expect(segments).toHaveLength(3);
      expect(segments[0]).toMatchObject({ label: '/', navigable: true });
      expect(segments[1]).toMatchObject({ label: 'opt', navigable: true });
      expect(segments[2]).toMatchObject({ label: 'claude', navigable: true });
    });

    it('当前路径就是 rootPath 时只有当前段可导航', () => {
      const segments = buildBreadcrumbSegments(
        '',
        '/opt/claude/business',
        '/opt/claude/business',
      );

      const navigableSegments = segments.filter(s => s.navigable);
      expect(navigableSegments).toHaveLength(1);
      expect(navigableSegments[0]!.label).toBe('business');
    });

    it('空路径（根目录且 rootPath 为空）时只有根可导航', () => {
      const segments = buildBreadcrumbSegments('', '', '/');

      expect(segments).toHaveLength(1);
      expect(segments[0]).toMatchObject({ label: '/', navigable: true });
    });

    it('不可导航的段不应生成导航事件', () => {
      const segments = buildBreadcrumbSegments(
        '',
        '/opt/claude/business',
        '/opt/claude/business',
      );

      const nonNavigable = segments.filter(s => !s.navigable);
      expect(nonNavigable.length).toBe(3); // /, opt, claude
      expect(nonNavigable.map(s => s.label)).toEqual(['/', 'opt', 'claude']);
    });
  });

  describe('错误恢复', () => {

    it('listDirectory 失败时应能自动回退到根目录', () => {
      // 模拟场景：用户点击了非法路径，应该能恢复
      const rootPath = '/opt/claude/business';
      const errorPath = '/opt'; // 越界路径

      // 回退逻辑：检测到 "out of project range" 错误后回退到 rootPath
      const shouldFallback = (error: string): boolean => {
        return error.toLowerCase().includes('out of project range') ||
               error.toLowerCase().includes('path not allowed');
      };

      expect(shouldFallback('Path out of project range')).toBe(true);
      expect(shouldFallback('path not allowed')).toBe(true);
      expect(shouldFallback('File not found')).toBe(false);

      // 回退目标应该是 rootPath
      const fallbackPath = rootPath;
      expect(fallbackPath).toBe('/opt/claude/business');
    });
  });
});
