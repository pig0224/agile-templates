#!/usr/bin/env node
/**
 * 模板注册中心一致性校验（自含脚本，无外部依赖）。
 * 与 agile CLI（src/core/template-registry.ts validateTemplateRepo）同契约项 + 本脚本独有项：
 *   1. 模板名 ^[a-z][a-z0-9-]*$
 *   2. path 相对仓库根、目录存在（禁止绝对路径 / ..）
 *   3. 目录 basename === 模板名（一目录一身份）
 *   4. 同一目录不被多个模板引用
 *   5. registry.yaml 重复键检测（模板名/组合名与各自内属性）
 *   6. 项目级规范骨架：每个单例模板与组合成员模板必须自带
 *      CLAUDE.md + docs/conventions.md + docs/architecture.md（成员 = 组合专属完整模板，同标准）
 *   7. 反向完整性（防幽灵静默不可用）：
 *      - singles/ 子目录必须全部登记为模板
 *      - solutions/ 存在时：其下每个组合目录必须已登记，组合目录下每个成员目录必须登记进 members
 *      - 根一级目录白名单：singles / solutions / docs / scripts / 隐藏目录，其余报错
 *   8. 组合模板（solutions 段）：组合名规范且全局唯一（不与模板/组合/成员名重名）；
 *      members 为纯成员名清单（逗号分隔，如 backend,frontend，顺序 = 生成顺序）；
 *      每个成员必须存在 solutions/<组合>/<成员>/ 目录（登记与目录双向一致）；
 *      成员名全局唯一（vs 全部模板名 / 其他组合成员名 / 全部组合名——
 *      成员平铺落盘 projects/ 后直接占用顶层目录名，与模板/组合同命名空间）
 * 退出码：0 = 通过；1 = 存在问题
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 极简 YAML 解析（仅支持 registry.yaml 的两层数值结构：templates / solutions 段），重复键 / tab 缩进报错 */
function parseRegistry(content) {
  const sections = { templates: new Map(), solutions: new Map() };
  const seenKeys = { templates: new Set(), solutions: new Set() };
  let section = null;
  let currentName = null;
  let seenProps = null;
  const kind = (s) => (s === 'solutions' ? '组合模板' : '模板');

  for (const rawLine of content.split(/\r?\n/)) {
    if (/^[ \t]*\t/.test(rawLine)) throw new Error('registry.yaml 不允许 tab 缩进（请用空格）');
    // 仅当 # 位于行首或前面有空白时才是注释（值内 # 如 "C#" 不受影响）
    const line = rawLine.replace(/(^|\s)#.*$/, '').trimEnd();
    if (line.trim().length === 0) continue;
    const indent = line.length - line.trimStart().length;

    if (indent === 0) {
      currentName = null;
      section = null;
      const m = /^(templates|solutions):\s*$/.exec(line.trim());
      if (m) section = m[1];
      continue;
    }
    if (!section) continue;

    const text = line.trim();
    const kv = /^(.+?):\s*(.*)$/.exec(text);
    if (!kv) continue;
    const [, rawKey, value] = kv;

    if (indent < 4) {
      const key = rawKey ?? '';
      if (seenKeys[section].has(key)) throw new Error(`registry.yaml 存在重复${kind(section)}名：${key}`);
      seenKeys[section].add(key);
      currentName = key;
      seenProps = new Set();
      sections[section].set(key, {});
    } else if (currentName) {
      const prop = rawKey ?? '';
      if (seenProps.has(prop)) throw new Error(`registry.yaml ${kind(section)} ${currentName} 存在重复属性：${prop}`);
      seenProps.add(prop);
      sections[section].get(currentName)[prop] = value;
    }
  }
  return {
    templates: Object.fromEntries(sections.templates),
    solutions: Object.fromEntries(sections.solutions),
  };
}

const NAME_RE = /^[a-z][a-z0-9-]*$/;
const SKELETON_FILES = ['CLAUDE.md', 'docs/conventions.md', 'docs/architecture.md'];
const ROOT_ALLOWED_DIRS = new Set(['singles', 'solutions', 'docs', 'scripts']);

async function isDir(p) {
  return fs.stat(p).then((s) => s.isDirectory()).catch(() => false);
}

/** 规范骨架三文件校验（单例模板与组合成员模板同标准；目录缺失时跳过——由调用方报目录不存在） */
async function checkSkeleton(label, dir, issues) {
  if (!(await isDir(dir))) return;
  for (const relFile of SKELETON_FILES) {
    const exists = await fs
      .stat(path.join(dir, relFile))
      .then((s) => s.isFile())
      .catch(() => false);
    if (!exists) {
      issues.push(`${label} 缺少项目级规范骨架文件：${relFile}`);
    }
  }
}

async function main() {
  const file = path.join(repoDir, 'registry.yaml');
  const content = await fs.readFile(file, 'utf8').catch(() => {
    console.error(`✖ 缺少 registry.yaml`);
    process.exit(1);
  });
  let registry;
  try {
    registry = parseRegistry(content);
  } catch (e) {
    console.error(`✖ ${(e).message}`);
    process.exit(1);
  }
  const templates = registry.templates;
  const solutions = registry.solutions;

  const issues = [];
  const seenDirs = new Map();
  let count = 0;

  // 第 1–4 项 + 第 6 项（单例模板）：path / 目录 / 同名 / 防别名 / 规范骨架
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
    if (!(await isDir(dir))) {
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
    await checkSkeleton(`模板 ${name}`, dir, issues);
  }

  // 第 7 项（a）：singles/ 子目录必须全部登记为模板（防幽灵单例模板）
  const singlesDir = path.join(repoDir, 'singles');
  if (await isDir(singlesDir)) {
    for (const ent of await fs.readdir(singlesDir, { withFileTypes: true })) {
      if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
      if (templates[ent.name] === undefined) {
        issues.push(`目录 singles/${ent.name}/ 未在 registry.yaml 登记——新增单例模板请补登记`);
      }
    }
  }

  // 第 7 项（b）：根一级目录白名单（布局目录 + 仓库自有目录 + 隐藏目录），其余报错
  for (const ent of await fs.readdir(repoDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    if (ent.name.startsWith('.') || ROOT_ALLOWED_DIRS.has(ent.name)) continue;
    issues.push(
      `根一级目录 ${ent.name}/ 不在布局白名单（singles/ solutions/ docs/ scripts/）——` +
        `单例模板移入 singles/，组合模板建 solutions/<组合>/<成员>/；确非模板目录则加入本脚本 ROOT_ALLOWED_DIRS`,
    );
  }

  // 第 8 项 + 第 6/7 项（组合成员）：名全局唯一 / members 纯名清单 / 双向一致 / 成员骨架
  const solutionNames = new Set(Object.keys(solutions));
  const memberOwner = new Map(); // 成员名 → 归属组合（全局唯一命名空间）
  let memberCount = 0;
  for (const [name, entry] of Object.entries(solutions)) {
    if (!NAME_RE.test(name)) {
      issues.push(`组合模板名 "${name}" 不符合规范 ^[a-z][a-z0-9-]*$`);
      continue;
    }
    if (templates[name] !== undefined) {
      issues.push(`组合模板 "${name}" 与模板重名（组合与模板必须可区分）`);
      continue;
    }
    const members = String(entry.members ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (members.length === 0) {
      issues.push(`组合模板 ${name} 的 members 不能为空（成员名清单，逗号分隔，如 backend,frontend）`);
      continue;
    }
    const declared = new Set();
    for (const member of members) {
      if (!NAME_RE.test(member)) {
        issues.push(
          `组合模板 ${name} 的成员 "${member}" 不合法（成员名须满足 ^[a-z][a-z0-9-]*$）`,
        );
        continue;
      }
      if (declared.has(member)) {
        issues.push(`组合模板 ${name} 的成员名重复：${member}`);
        continue;
      }
      declared.add(member);
      memberCount++;

      // 成员目录必须实际存在（成员 = 组合专属完整模板骨架）
      const memberDir = path.join(repoDir, 'solutions', name, member);
      if (!(await isDir(memberDir))) {
        issues.push(
          `组合模板 ${name} 的成员目录不存在：solutions/${name}/${member}/（成员是组合专属模板目录，须实际存在）`,
        );
      }
      await checkSkeleton(`组合模板 ${name} 的成员 ${member}`, memberDir, issues);

      // 成员名全局唯一：平铺落盘 projects/ 后直接占用顶层目录名，与模板/组合/其他成员同空间
      if (templates[member] !== undefined) {
        issues.push(
          `组合模板 ${name} 的成员名 "${member}" 与单例模板名冲突（成员平铺落盘 projects/ 会抢占目录名，成员名必须全局唯一）`,
        );
      } else if (solutionNames.has(member)) {
        issues.push(`组合模板 ${name} 的成员名 "${member}" 与组合模板名冲突（成员名必须全局唯一）`);
      } else {
        const owner = memberOwner.get(member);
        if (owner) {
          issues.push(
            `组合模板 ${name} 的成员名 "${member}" 与组合 ${owner} 的成员名冲突（成员名必须全局唯一）`,
          );
        } else {
          memberOwner.set(member, name);
        }
      }
    }

    // 反向一致性：solutions/<组合>/ 下的子目录必须全部登记进 members（防幽灵成员目录）
    const solDir = path.join(repoDir, 'solutions', name);
    if (await isDir(solDir)) {
      for (const ent of await fs.readdir(solDir, { withFileTypes: true })) {
        if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
        if (!declared.has(ent.name)) {
          issues.push(
            `目录 solutions/${name}/${ent.name}/ 未登记进组合 ${name} 的 members（登记与成员目录须双向一致）`,
          );
        }
      }
    }
  }

  // 第 7 项（c）：solutions/ 下的目录必须全部是已登记组合（防幽灵组合目录）
  const solutionsRoot = path.join(repoDir, 'solutions');
  if (await isDir(solutionsRoot)) {
    for (const ent of await fs.readdir(solutionsRoot, { withFileTypes: true })) {
      if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
      if (solutions[ent.name] === undefined) {
        issues.push(`目录 solutions/${ent.name}/ 未在 registry.yaml 的 solutions 段登记——请补登记或删除该目录`);
      }
    }
  }

  if (issues.length > 0) {
    for (const issue of issues) console.error(`✖ ${issue}`);
    process.exit(1);
  }
  console.log(
    `✔ 注册中心一致：${count} 个单例模板${Object.keys(solutions).length > 0 ? `、${Object.keys(solutions).length} 个组合（${memberCount} 个成员）` : ''}，无问题。`,
  );
}

main();
