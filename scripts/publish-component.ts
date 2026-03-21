#!/usr/bin/env tsx

/**
 * Component Publish Script
 *
 * 组件发布脚本
 * 用于将开发中的组件发布到组件市场
 *
 * 使用方法:
 *   npx tsx scripts/publish-component.ts hello-world
 *   npx tsx scripts/publish-component.ts agent-management --target ./market
 *   npx tsx scripts/publish-component.ts todolist --dry-run
 *
 * 参数:
 *   component-name    组件名称（自动从 gallery 目录查找）
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// 获取项目根目录（脚本所在目录的父目录）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const GALLERY_DIR = path.join(PROJECT_ROOT, 'gallery');

// ========== Type Definitions ==========

interface ComponentManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  icon?: string;
  entry: string;
  styles?: string[];
  capabilities: {
    required: string[];
    optional: string[];
    provided: string[];
  };
  permissions?: string[];
}

interface RegistryEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  icon?: string;
  manifestUrl: string;
  entryUrl: string;
  capabilities: {
    required: string[];
    optional: string[];
  };
  publishedAt: string;
  size?: number;
}

interface Registry {
  version: string;
  components: RegistryEntry[];
  lastUpdated: string;
}

interface PublishOptions {
  source: string;
  target: string;
  compile: boolean;
  dryRun: boolean;
  verbose: boolean;
}

// ========== Logger ==========

// 使用常量对象代替 enum（ES module 兼容）
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SUCCESS: 4
} as const;

type LogLevelType = typeof LogLevel[keyof typeof LogLevel];

class Logger {
  private level: LogLevelType;

  constructor(verbose: boolean = false) {
    this.level = verbose ? LogLevel.DEBUG : LogLevel.INFO;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`\x1b[36m[DEBUG]\x1b[0m ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`\x1b[34m[INFO]\x1b[0m ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`\x1b[33m[WARN]\x1b[0m ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`, ...args);
    }
  }

  success(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.SUCCESS) {
      console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}`, ...args);
    }
  }
}

// ========== Utilities ==========

/**
 * 递增版本号（patch 版本）
 * 例如: 1.0.0 -> 1.0.1, 1.1.9 -> 1.1.10
 */
function incrementVersion(version: string): string {
  const parts = version.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid version format: ${version}`);
  }

  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  const patch = parseInt(parts[2], 10);

  // 递增 patch 版本号
  const newPatch = patch + 1;
  return `${major}.${minor}.${newPatch}`;
}

function getFileSize(filePath: string): number {
  const stats = fs.statSync(filePath);
  return stats.size;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// ========== Validation ==========

class ComponentValidator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 验证组件目录是否存在
   */
  validateDirectory(sourcePath: string): void {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Component directory not found: ${sourcePath}`);
    }

    const stat = fs.statSync(sourcePath);
    if (!stat.isDirectory()) {
      throw new Error(`Source path is not a directory: ${sourcePath}`);
    }

    this.logger.debug('Directory validation passed', { path: sourcePath });
  }

  /**
   * 验证 manifest.json 格式
   */
  validateManifest(manifest: ComponentManifest): void {
    // 验证必需字段
    if (!manifest.name) {
      throw new Error('Manifest missing required field: name');
    }
    if (!manifest.version) {
      throw new Error('Manifest missing required field: version');
    }
    if (!manifest.description) {
      throw new Error('Manifest missing required field: description');
    }
    if (!manifest.entry) {
      throw new Error('Manifest missing required field: entry');
    }
    if (!manifest.capabilities) {
      throw new Error('Manifest missing required field: capabilities');
    }

    // 验证版本号格式 (semver)
    const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
    if (!versionRegex.test(manifest.version)) {
      throw new Error(`Invalid version format: ${manifest.version}`);
    }

    // 验证组件名称格式
    const nameRegex = /^[a-z0-9-]+$/;
    if (!nameRegex.test(manifest.name)) {
      throw new Error(
        `Invalid component name: ${manifest.name}. ` +
        `Name must contain only lowercase letters, numbers, and hyphens.`
      );
    }

    this.logger.debug('Manifest validation passed', {
      name: manifest.name,
      version: manifest.version
    });
  }

  /**
   * 验证必需文件是否存在
   */
  validateRequiredFiles(sourcePath: string, manifest: ComponentManifest): void {
    const requiredFiles: string[] = ['manifest.json'];

    // 检查 manifest.json
    for (const file of requiredFiles) {
      const filePath = path.join(sourcePath, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required file not found: ${file}`);
      }
    }

    // 检查入口文件
    const entryPath = path.join(sourcePath, manifest.entry);
    if (!fs.existsSync(entryPath)) {
      throw new Error(`Entry file not found: ${manifest.entry}`);
    }

    this.logger.debug('Required files validation passed');
  }
}

// ========== Compiler ==========

class ComponentCompiler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 编译 TypeScript 文件到 JavaScript
   */
  async compile(sourcePath: string, targetPath: string): Promise<void> {
    const sourceFile = path.join(sourcePath, 'index.ts');
    const targetFile = path.join(targetPath, 'index.js');

    if (!fs.existsSync(sourceFile)) {
      throw new Error(`Source file not found: ${sourceFile}`);
    }

    this.logger.info('Compiling component...', {
      source: sourceFile,
      target: targetFile
    });

    try {
      // 使用 esbuild 进行快速编译
      // 如果没有 esbuild，则回退到简单的复制
      await this.compileWithEsbuild(sourceFile, targetFile);
      this.logger.success('Compilation completed');
    } catch (error) {
      this.logger.warn('Esbuild not available, copying file directly');
      // 回退：直接复制文件（适用于已经是 JS 的组件）
      fs.copyFileSync(sourceFile, targetFile);
    }
  }

  /**
   * 使用 esbuild 编译
   */
  private async compileWithEsbuild(sourceFile: string, targetFile: string): Promise<void> {
    try {
      // 动态导入 esbuild
      const esbuild = await import('esbuild');

      await esbuild.build({
        entryPoints: [sourceFile],
        bundle: false,
        target: 'es2020',
        format: 'esm',
        outfile: targetFile,
        sourcemap: true,
        minify: false,
        treeShaking: true
      });

      this.logger.debug('Esbuild compilation successful');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error('Esbuild not installed');
      }
      throw error;
    }
  }
}

// ========== Registry Manager ==========

class RegistryManager {
  private logger: Logger;
  private registryPath: string;

  constructor(logger: Logger, marketPath: string) {
    this.logger = logger;
    this.registryPath = path.join(marketPath, 'registry.json');
  }

  /**
   * 读取注册表
   * 支持两种格式：
   * - 新格式：{ version, components: [...], lastUpdated }
   * - 旧格式：{ "com.workbench.xxx": {...}, ... }
   */
  loadRegistry(): Registry {
    if (!fs.existsSync(this.registryPath)) {
      this.logger.info('Registry not found, creating new one');
      return this.createEmptyRegistry();
    }

    const content = fs.readFileSync(this.registryPath, 'utf-8');
    const data = JSON.parse(content);

    // 检查是否是新格式（带 components 数组）
    if (data.components && Array.isArray(data.components)) {
      this.logger.debug('Registry loaded (new format)', {
        components: data.components.length
      });
      return data as Registry;
    }

    // 旧格式：键值对格式，需要转换
    this.logger.info('Converting registry from old format to new format');
    const components: RegistryEntry[] = [];
    for (const [id, entry] of Object.entries(data)) {
      if (typeof entry === 'object' && entry !== null) {
        components.push({
          id,
          ...(entry as Omit<RegistryEntry, 'id'>)
        });
      }
    }

    return {
      version: '1.0.0',
      components,
      lastUpdated: getCurrentTimestamp()
    };
  }

  /**
   * 保存注册表
   */
  saveRegistry(registry: Registry): void {
    registry.lastUpdated = getCurrentTimestamp();

    const content = JSON.stringify(registry, null, 2);
    fs.writeFileSync(this.registryPath, content, 'utf-8');

    this.logger.debug('Registry saved', {
      components: registry.components.length
    });
  }

  /**
   * 创建空注册表
   */
  private createEmptyRegistry(): Registry {
    return {
      version: '1.0.0',
      components: [],
      lastUpdated: getCurrentTimestamp()
    };
  }

  /**
   * 添加或更新组件
   */
  upsertComponent(manifest: ComponentManifest, apiBase: string): RegistryEntry {
    const registry = this.loadRegistry();

    const componentId = `com.workbench.${manifest.name}`;
    const entry: RegistryEntry = {
      id: componentId,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      icon: manifest.icon,
      manifestUrl: `${apiBase}/${manifest.name}/manifest.json?v=${manifest.version}`,
      entryUrl: `${apiBase}/${manifest.name}/index.js?v=${manifest.version}`,
      capabilities: {
        required: manifest.capabilities.required,
        optional: manifest.capabilities.optional
      },
      publishedAt: getCurrentTimestamp()
    };

    // 检查是否已存在
    const existingIndex = registry.components.findIndex(c => c.name === manifest.name);

    if (existingIndex >= 0) {
      // 更新现有组件
      const existing = registry.components[existingIndex];
      this.logger.info('Updating existing component', {
        name: manifest.name,
        oldVersion: existing.version,
        newVersion: manifest.version
      });
      registry.components[existingIndex] = entry;
    } else {
      // 添加新组件
      this.logger.info('Adding new component', {
        name: manifest.name,
        version: manifest.version
      });
      registry.components.push(entry);
    }

    this.saveRegistry(registry);

    return entry;
  }
}

// ========== Publisher ==========

class ComponentPublisher {
  private logger: Logger;
  private validator: ComponentValidator;
  private compiler: ComponentCompiler;

  constructor(logger: Logger) {
    this.logger = logger;
    this.validator = new ComponentValidator(logger);
    this.compiler = new ComponentCompiler(logger);
  }

  /**
   * 发布组件
   */
  async publish(options: PublishOptions): Promise<void> {
    const { source, target, compile, dryRun } = options;

    this.logger.info('Starting component publish...', {
      source,
      target,
      compile,
      dryRun
    });

    // 1. 验证源目录
    const sourcePath = path.resolve(source);
    this.validator.validateDirectory(sourcePath);

    // 2. 读取 manifest
    const manifestPath = path.join(sourcePath, 'manifest.json');
    let manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    let manifest = JSON.parse(manifestContent) as ComponentManifest;

    // 自动递增版本号
    const registryManager = new RegistryManager(this.logger, target);
    const registry = registryManager.loadRegistry();
    const existingComponent = registry.components.find(c => c.name === manifest.name);

    if (existingComponent) {
      // 组件已存在，自动递增版本号
      const oldVersion = manifest.version;
      manifest.version = incrementVersion(manifest.version);

      // 更新源文件中的 manifest.json
      manifestContent = JSON.stringify(manifest, null, 2);
      fs.writeFileSync(manifestPath, manifestContent, 'utf-8');

      // 同时更新 TypeScript 文件中的版本号（如果存在）
      const tsIndexPath = path.join(sourcePath, 'index.ts');
      if (fs.existsSync(tsIndexPath)) {
        const tsContent = fs.readFileSync(tsIndexPath, 'utf-8');
        const updatedTsContent = tsContent.replace(
          /readonly version = '.*?';/,
          `readonly version = '${manifest.version}';`
        );
        fs.writeFileSync(tsIndexPath, updatedTsContent, 'utf-8');
      }

      this.logger.info('Auto-incremented version', {
        name: manifest.name,
        oldVersion,
        newVersion: manifest.version
      });
    }

    this.validator.validateManifest(manifest);
    this.validator.validateRequiredFiles(sourcePath, manifest);

    // 3. 准备目标目录（发布到 target/components/<component-name>）
    const targetPath = path.join(target, 'components', manifest.name);

    if (!dryRun) {
      fs.mkdirSync(targetPath, { recursive: true });
      this.logger.debug('Target directory created', { path: targetPath });
    } else {
      this.logger.info('[DRY RUN] Would create directory', { path: targetPath });
    }

    // 4. 编译（如果需要）
    if (compile) {
      if (!dryRun) {
        await this.compiler.compile(sourcePath, targetPath);
      } else {
        this.logger.info('[DRY RUN] Would compile component');
      }
    }

    // 5. 复制文件
    const filesToCopy = ['manifest.json', 'package.json', 'README.md'];

    for (const file of filesToCopy) {
      const srcFile = path.join(sourcePath, file);
      if (fs.existsSync(srcFile)) {
        const destFile = path.join(targetPath, file);
        if (!dryRun) {
          fs.copyFileSync(srcFile, destFile);
          this.logger.debug('File copied', { file });
        } else {
          this.logger.info('[DRY RUN] Would copy file', { file });
        }
      }
    }

    // 6. 如果不需要编译，复制入口文件和 source map
    if (!compile) {
      const entrySrc = path.join(sourcePath, manifest.entry);
      const entryDest = path.join(targetPath, 'index.js');

      if (fs.existsSync(entrySrc)) {
        if (!dryRun) {
          fs.copyFileSync(entrySrc, entryDest);
          this.logger.debug('Entry file copied');
        } else {
          this.logger.info('[DRY RUN] Would copy entry file');
        }
      }

      // 复制 source map 文件
      const sourceMapSrc = path.join(sourcePath, 'index.js.map');
      if (fs.existsSync(sourceMapSrc)) {
        const sourceMapDest = path.join(targetPath, 'index.js.map');
        if (!dryRun) {
          fs.copyFileSync(sourceMapSrc, sourceMapDest);
          this.logger.debug('Source map copied');
        } else {
          this.logger.info('[DRY RUN] Would copy source map');
        }
      }

      // 复制 CSS 文件
      const cssSrc = path.join(sourcePath, 'index.css');
      if (fs.existsSync(cssSrc)) {
        const cssDest = path.join(targetPath, 'index.css');
        if (!dryRun) {
          fs.copyFileSync(cssSrc, cssDest);
          this.logger.debug('CSS file copied');
        } else {
          this.logger.info('[DRY RUN] Would copy CSS file');
        }
      }

      // 复制 CSS source map 文件
      const cssMapSrc = path.join(sourcePath, 'index.css.map');
      if (fs.existsSync(cssMapSrc)) {
        const cssMapDest = path.join(targetPath, 'index.css.map');
        if (!dryRun) {
          fs.copyFileSync(cssMapSrc, cssMapDest);
          this.logger.debug('CSS source map copied');
        } else {
          this.logger.info('[DRY RUN] Would copy CSS source map');
        }
      }
    }

    // 7. 更新注册表
    if (!dryRun) {
      const registryManager = new RegistryManager(this.logger, target);
      const entry = registryManager.upsertComponent(manifest, '/market/components');

      // 计算文件大小
      const indexJsPath = path.join(targetPath, 'index.js');
      if (fs.existsSync(indexJsPath)) {
        entry.size = getFileSize(indexJsPath);
        registryManager.saveRegistry(registryManager.loadRegistry());
      }

      this.logger.success('Component published successfully!', {
        id: entry.id,
        name: entry.name,
        version: entry.version,
        size: entry.size ? formatSize(entry.size) : undefined
      });
    } else {
      this.logger.info('[DRY RUN] Would update registry');
    }
  }
}

// ========== CLI ==========

function parseArguments(): PublishOptions {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('\x1b[36m%s\x1b[0m', 'Component Publish Script');
    console.log('');
    console.log('Usage: npx tsx scripts/publish-component.ts <component-name> [options]');
    console.log('');
    console.log('Arguments:');
    console.log('  component-name    组件名称（自动从 gallery 目录查找）');
    console.log('');
    console.log('Options:');
    console.log('  --target <path>   目标市场目录 (默认: /opt/market)');
    console.log('  --compile         编译 TypeScript（默认直接复制已编译的 index.js）');
    console.log('  --no-compile      不编译，直接复制');
    console.log('  --dry-run         验证但不发布');
    console.log('  --verbose         显示详细日志');
    console.log('');
    console.log('Examples:');
    console.log('  npx tsx scripts/publish-component.ts hello-world');
    console.log('  npx tsx scripts/publish-component.ts agent-management --verbose');
    console.log('  npx tsx scripts/publish-component.ts todolist --dry-run');
    process.exit(0);
  }

  // 获取组件名，自动补全路径
  let componentName = args[0];

  // 如果传入的是完整路径，提取组件名
  if (componentName.includes('/') || componentName.includes('\\')) {
    componentName = path.basename(componentName);
  }

  // 构建完整源路径
  const sourcePath = path.join(GALLERY_DIR, componentName);

  // 默认目标目录为 /opt/market
  const defaultTarget = '/opt/market';

  const options: PublishOptions = {
    source: sourcePath,
    target: defaultTarget,
    compile: false,  // 默认不编译，直接复制已编译的 index.js
    dryRun: false,
    verbose: false
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--target':
        const targetPath = args[++i];
        // 如果是相对路径，相对于项目根目录
        options.target = path.isAbsolute(targetPath)
          ? targetPath
          : path.join(PROJECT_ROOT, targetPath);
        break;
      case '--no-compile':
        options.compile = false;
        break;
      case '--compile':
        options.compile = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArguments();
  const logger = new Logger(options.verbose);

  try {
    const publisher = new ComponentPublisher(logger);
    await publisher.publish(options);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
      if (options.verbose && error.stack) {
        console.error(error.stack);
      }
    } else {
      logger.error('Unknown error occurred');
    }
    process.exit(1);
  }
}

// ES module 方式运行
main().catch(error => {
  console.error(error);
  process.exit(1);
});

export { ComponentPublisher, PublishOptions, Logger };
