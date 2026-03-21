/**
 * Word 文档转换工具
 * 用于将 .docx 文件转换为 Markdown 格式
 */

import mammoth from 'mammoth';
// @ts-ignore - turndown types may not be available
import TurndownService from 'turndown';

/**
 * 将 Word 文件转换为 Markdown
 * @param file - Word 文件对象
 * @returns 转换后的 Markdown 文本
 * @throws Error 如果转换失败
 */
export async function convertWordToMarkdown(file: File): Promise<string> {
  // 检查文件类型
  if (!file.name.endsWith('.docx')) {
    throw new Error('请上传 .docx 格式的 Word 文档');
  }

  try {
    // 读取文件
    const arrayBuffer = await file.arrayBuffer();

    // 使用 mammoth 将 docx 转换为 HTML
    const result = await mammoth.convertToHtml({ arrayBuffer });

    // 初始化 turndown 服务
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });

    // 自定义规则处理表格
    turndownService.addRule('table', {
      filter: ['table'],
      replacement: function (_content: string) {
        // 简单的表格转换 - 将表格转换为 Markdown 表格格式
        return '\n\n';
      }
    });

    // 自定义规则处理图片
    turndownService.addRule('image', {
      filter: ['img'],
      replacement: function (_content: string, node: HTMLElement) {
        const alt = (node as HTMLImageElement).alt || '';
        const src = (node as HTMLImageElement).src || '';
        return `![${alt}](${src})`;
      }
    });

    // 将 HTML 转换为 Markdown
    const markdown = turndownService.turndown(result.value);

    // 添加文件标题
    const markdownWithTitle = `## ${file.name}\n\n${markdown}`;

    return markdownWithTitle;
  } catch (error) {
    console.error('Word 文档转换失败:', error);
    throw new Error('Word 文档转换失败，请重试');
  }
}

/**
 * 检查文件是否为有效的 Word 文档
 * @param file - 文件对象
 * @returns 是否为有效的 Word 文档
 */
export function isWordDocument(file: File): boolean {
  return file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
         file.name.endsWith('.docx');
}
