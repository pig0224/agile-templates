#!/usr/bin/env node
/**
 * 模板注册中心一致性校验（自含脚本，无外部依赖）。
 * 前 4 项与 agile CLI 的 src/core/template-registry.ts validateTemplateRepo 同契约；
 * 第 5/6/7 项为本脚本独有（CLI 不校验）：
 *   1. 模板名 ^[a-z][a-z0-9-]*$
 *   2. path 相对仓库根、目录存在（禁止绝对路径 / ..）
 *   3. 目录 basename === 模板名（一目录一身份）
 *   4. 同一目录不被多个模板引用
 *   5. registry.yaml 重复键检测（模板名与模板内属性）
 *   6. 项目级规范骨架：每模板必须自带 CLAUDE.md + docs/conventions.md + docs/architecture.md
 *      （init project 生成项目时随模板带出，作为项目级规范入口）
 *   7. 反向完整性：仓库根一级目录（隐藏目录与 IGNORED_DIRS 除外）必须全部登记为模板——
 *      防「目录建了、registry.yaml 忘了登记」的幽灵模板静默不可用
 * 退出码：0 = 通过；1 = 存在问题
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 极简 YAML 解析（仅支持 registry.yaml 的两层数值结构），重复键 / tab 缩进报错 */
function parseRegistry(content) {
  const templates = new Map();
  const seenKeys = new Set();
  let inTemplates = false;
  let currentName = null;
  let seenProps = null;

  for (const rawLine of content.split(/\r?\n/)) {
    if (/^[ \t]*\t/.test(rawLine)) throw new Error('registry.yaml 不允许 tab 缩进（请用空格）');
    // 仅当 # 位于行首或前面有空白时才是注释（值内 # 如 "C#" 不受影响）
    const line = rawLine.replace(/(^|\s)#.*$/, '').trimEnd();
    if (line.trim().length === 0) continue;
    const indent = line.length - line.trimStart().length;

    if (indent === 0) {
      currentName = null;
      inTemplates = /^templates:\s*$/.test(line.trim());
      continue;
    }
    if (!inTemplates) continue;

    const text = line.trim();
    const kv = /^(.+?):\s*(.*)$/.exec(text);
    if (!kv) continue;
    const [, rawKey, value] = kv;

    if (indent < 4) {
      const key = rawKey ?? '';
      if (seenKeys.has(key)) throw new Error(`registry.yaml 存在重复模板名：${key}`);
      seenKeys.add(key);
      currentName = key;
      seenProps = new Set();
      templates.set(key, {});
    } else if (currentName) {
      const prop = rawKey ?? '';
      if (seenProps.has(prop)) throw new Error(`registry.yaml 模板 ${currentName} 存在重复属性：${prop}`);
      seenProps.add(prop);
      templates.get(currentName)[prop] = value;
    }
  }
  return Object.fromEntries(templates);
}

const NAME_RE = /^[a-z][a-z0-9-]*$/;

async function main() {
  const file = path.join(repoDir, 'registry.yaml');
  const content = await fs.readFile(file, 'utf8').catch(() => {
    console.error(`✖ 缺少 registry.yaml`);
    process.exit(1);
  });
  let templates;
  try {
    templates = parseRegistry(content);
  } catch (e) {
    console.error(`✖ ${(e).message}`);
    process.exit(1);
  }

  const issues = [];
  const seenDirs = new Map();
  let count = 0;

  for (const [name, entry] of Object.entries(templates)) {
    count++;
    if (!NAME_RE.test(name)) {
      issues.push(`模板名 "${name}" 不符合规范 ^[a-z][a-z0-9-]*$`);
      continue;
    }
    const rel = (entry.path ?? `./${name}`).replace(/\\/g, '/');
    if (path.isAbsolute(rel) || rel.split('/').includes('..')) {
      issues.push(`模板 ${name} 的 path 非法（禁止绝对路径或 ..）：${entry.path}`);
      continue;
    }
    const dir = path.join(repoDir, rel);
    const isDir = await fs.stat(dir).then((s) => s.isDirectory()).catch(() => false);
    if (!isDir) {
      issues.push(`模板 ${name} 的目录不存在：${rel}`);
      continue;
    }
    const base = path.basename(dir);
    if (base !== name) {
      issues.push(`模板 ${name} 的目录名 "${base}" 与 name 不一致（必须同名）`);
    }
    const owner = seenDirs.get(dir);
    if (owner) {
      issues.push(`模板 ${name} 与 ${owner} 指向同一目录 ${rel}（不允许）`);
    } else {
      seenDirs.set(dir, name);
    }
    for (const relFile of ['CLAUDE.md', 'docs/conventions.md', 'docs/architecture.md']) {
      const exists = await fs
        .stat(path.join(dir, relFile))
        .then((s) => s.isFile())
        .catch(() => false);
      if (!exists) {
        issues.push(`模板 ${name} 缺少项目级规范骨架文件：${relFile}`);
      }
    }
  }

  // 第 7 项：反向完整性——仓库根一级目录（除忽略清单）必须全部登记为模板
  const covered = new Set(seenDirs.keys());
  const IGNORED_DIRS = new Set(['.github', 'docs', 'scripts']);
  for (const ent of await fs.readdir(repoDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    if (ent.name.startsWith('.') || IGNORED_DIRS.has(ent.name)) continue;
    if (!covered.has(path.join(repoDir, ent.name))) {
      issues.push(
        `目录 ${ent.name}/ 未在 registry.yaml 登记——新增模板请补登记；确非模板目录则加入本脚本 IGNORED_DIRS`,
      );
    }
  }

  if (issues.length > 0) {
    for (const issue of issues) console.error(`✖ ${issue}`);
    process.exit(1);
  }
  console.log(`✔ 注册中心一致：${count} 个模板，无问题。`);
}

main();
