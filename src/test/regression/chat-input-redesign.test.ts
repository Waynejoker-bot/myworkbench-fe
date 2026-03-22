/**
 * ChatInput Two-Row Layout Redesign Tests
 *
 * Verifies the input bar uses a two-row layout:
 * Row 1: Textarea with padding
 * Row 2: Toolbar (+ button left, send button right)
 */
import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), 'utf-8');
}

describe('ChatInput Two-Row Layout Redesign', () => {

  const source = readSource('components/chat/ChatInput.tsx');

  test('outer container should have rounded border styling (rounded-2xl border)', () => {
    // The input wrapper should have visible border and rounded corners
    const hasRoundedBorder = /rounded-2xl/.test(source) && /border/.test(source);
    expect(hasRoundedBorder).toBe(true);
  });

  test('outer container should have focus glow effect', () => {
    // Focus should change border color and add box-shadow
    const hasFocusHandler = /onFocus.*borderColor.*0ea5e9|onFocus.*boxShadow/s.test(source);
    const hasBlurHandler = /onBlur.*borderColor|onBlur.*boxShadow/s.test(source);
    expect(hasFocusHandler).toBe(true);
    expect(hasBlurHandler).toBe(true);
  });

  test('textarea should be in its own row with padding (Row 1)', () => {
    // Textarea should be wrapped in a div with pt (padding-top) and px (padding-x)
    const hasTextareaRow = /px-4.*pt-3[\s\S]*?<textarea/s.test(source);
    expect(hasTextareaRow).toBe(true);
  });

  test('action buttons should be in a separate toolbar row (Row 2)', () => {
    // + button and send button in a justify-between flex container
    const hasToolbarRow = /justify-between[\s\S]*?上传文件[\s\S]*?发送消息|justify-between[\s\S]*?Plus[\s\S]*?Send/s.test(source);
    expect(hasToolbarRow).toBe(true);
  });

  test('+ button and send button should NOT be in the same flex row as textarea', () => {
    // The old layout had: flex items-stretch gap-2 with textarea, +button, send button all inline
    // New layout: textarea in Row 1, buttons in Row 2
    const hasOldInlineLayout = /flex items-stretch gap-2.*rounded-2xl/s.test(source);
    expect(hasOldInlineLayout).toBe(false);
  });

  test('placeholder text should be concise', () => {
    // Placeholder was shortened from the overly long one
    const hasShortPlaceholder = /输入消息.*选择目标 Agent/.test(source);
    expect(hasShortPlaceholder).toBe(true);
    // Should NOT have the old overly long placeholder
    const hasOldLongPlaceholder = /可直接粘贴图片或点击.*上传文档/.test(source);
    expect(hasOldLongPlaceholder).toBe(false);
  });

  test('send button should be transparent when empty, colored when has content', () => {
    const hasConditionalBg = /hasContent.*0ea5e9.*transparent|backgroundColor.*hasContent/s.test(source);
    expect(hasConditionalBg).toBe(true);
  });
});
