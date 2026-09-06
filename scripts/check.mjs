#!/usr/bin/env node
/**
 * 模板注册中心一致性校验（自含脚本，无外部依赖）。
 * 与 agile CLI 的 src/core/template-registry.ts validateTemplateRepo 保持同一契约：
 *   1. 模板名 ^[a-z][a-z0-9-]*$
 *   2. path 相对仓库根、目录存在（禁止绝对路径 / ..）
 *   3. 目录 basename === 模板名（一目录一身份）
 *   4. 同一目录不被多个模板引用
 *   5. registry.yaml 重复键检测
 *   6. 项目级规范骨架：每模板必须自带 CLAUDE.md + docs/conventions.md + docs/architecture.md
 *      （init project 生成项目时随模板带出，作为项目级规范入口）
 * 退出码：0 = 通过；1 = 存在问题
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 极简 YAML 解析（仅支持 registry.yaml 的两层数值结构），重复键报错 */
function parseRegistry(content) {
  const templates = new Map();
  const seenKeys = new Set();
  let inTemplates = false;
  let currentName = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trimEnd();
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

    if (indent === 2) {
      const key = rawKey ?? '';
      if (seenKeys.has(key)) throw new Error(`registry.yaml 存在重复模板名：${key}`);
      seenKeys.add(key);
      currentName = key;
      templates.set(key, {});
    } else if (indent === 4 && currentName) {
      templates.get(currentName)[rawKey ?? ''] = value;
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

  if (issues.length > 0) {
    for (const issue of issues) console.error(`✖ ${issue}`);
    process.exit(1);
  }
  console.log(`✔ 注册中心一致：${count} 个模板，无问题。`);
}

main();
