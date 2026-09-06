#!/usr/bin/env node
/**
 * 模板注册中心一致性校验（自含脚本，无外部依赖）。
 * registry.json v2：singles / solutions 全数组、目录由名字约定派生（无 path 字段）。
 * 与 agile CLI（src/core/template-registry.ts validateTemplateRepo）同契约项 + 本脚本独有项：
 *   1. version === 2；顶层仅允许 $schema / version / singles / solutions；条目无未知字段
 *   2. 条目形状：name + description 必填；language / framework 可选（非空字符串数组）；
 *      组合 projects 条目与 singles 条目同形状
 *   3. 名字规范：模板名 / 组合名 / 成员名 ^[a-z][a-z0-9-]*$
 *   4. 重复键检测（JSON.parse 对重复键静默取后者，须显式扫描）：registry.json 任意对象内重复键报错
 *   5. 数组内重复登记（JSON 数组无键唯一性保证）：singles 重名 / solutions 重名 / 同组合 projects 重名
 *   6. 目录由约定派生且必须实际存在：单例 = singles/<name>/，成员 = solutions/<组合>/<name>/
 *   7. 项目级规范骨架：CLAUDE.md + docs/conventions.md + docs/architecture.md（单例与成员同标准）
 *   8. 反向完整性（防幽灵静默不可用）：
 *      - singles/ 子目录必须全部登记
 *      - solutions/ 子目录必须全部登记为组合；组合目录下子目录必须全部登记进 projects
 *      - 根一级目录白名单：singles / solutions / docs / scripts / 隐藏目录，其余报错
 *   9. 三段全局唯一：模板名 / 组合名 / 成员名互不重名（双向校验，含组合名 vs 其他组合的成员名）
 *  10. registry.yaml 已废弃：仓库内不得再保留（v2 起唯一注册中心为 registry.json）
 * 退出码：0 = 通过；1 = 存在问题
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const NAME_RE = /^[a-z][a-z0-9-]*$/;
const SKELETON_FILES = ['CLAUDE.md', 'docs/conventions.md', 'docs/architecture.md'];
const ROOT_ALLOWED_DIRS = new Set(['singles', 'solutions', 'docs', 'scripts']);
const ENTRY_FIELDS = ['name', 'description', 'language', 'framework'];
const SOLUTION_FIELDS = ['name', 'description', 'projects'];

async function isDir(p) {
  return fs.stat(p).then((s) => s.isDirectory()).catch(() => false);
}

async function isFile(p) {
  return fs.stat(p).then((s) => s.isFile()).catch(() => false);
}

/** 规范骨架三文件校验（单例模板与组合成员模板同标准；目录缺失时跳过——由调用方报目录不存在） */
async function checkSkeleton(label, dir, issues) {
  if (!(await isDir(dir))) return;
  for (const relFile of SKELETON_FILES) {
    if (!(await isFile(path.join(dir, relFile)))) {
      issues.push(`${label} 缺少项目级规范骨架文件：${relFile}`);
    }
  }
}

/** registry.json 重复键扫描（JSON.parse 对重复键静默取后者，必须先行显式检测）。
 *  极简状态机：跟踪对象/数组嵌套栈，收集每个对象内的键；只找重复键，语法错误交给 JSON.parse。 */
function scanDupKeys(content) {
  const tokens = [];
  {
    let inStr = false;
    let esc = false;
    let buf = '';
    for (const ch of content) {
      if (inStr) {
        if (esc) {
          buf += ch;
          esc = false;
        } else if (ch === '\\') {
          buf += ch;
          esc = true;
        } else if (ch === '"') {
          tokens.push({ t: 's', v: buf });
          inStr = false;
        } else {
          buf += ch;
        }
        continue;
      }
      if (ch === '"') {
        inStr = true;
        buf = '';
        continue;
      }
      if ('{}[]:,'.includes(ch)) tokens.push({ t: ch });
    }
  }
  const stack = []; // 'obj' | 'arr' 嵌套栈
  const objIds = []; // 每层对象 id（objSeq 单调递增，区分兄弟对象）
  const keysByObj = new Map(); // objId → Map(key → 次数)
  let objSeq = 0;
  let lastStr = null; // 最近一个完整字符串 token（: 前即为键）
  for (const tk of tokens) {
    if (tk.t === 's') {
      lastStr = tk.v;
    } else if (tk.t === '{') {
      const id = ++objSeq;
      stack.push('obj');
      objIds.push(id);
      keysByObj.set(id, new Map());
    } else if (tk.t === '}') {
      if (stack.at(-1) === 'obj') {
        stack.pop();
        objIds.pop();
      }
    } else if (tk.t === '[') {
      stack.push('arr');
    } else if (tk.t === ']') {
      if (stack.at(-1) === 'arr') stack.pop();
    } else if (tk.t === ':') {
      const id = objIds.at(-1);
      if (stack.at(-1) === 'obj' && id !== undefined) {
        const m = keysByObj.get(id);
        m.set(lastStr, (m.get(lastStr) ?? 0) + 1);
      }
      lastStr = null;
    } else if (tk.t === ',') {
      lastStr = null;
    }
  }
  const dups = [];
  for (const m of keysByObj.values()) {
    for (const [k, n] of m) if (n > 1) dups.push(k);
  }
  return dups;
}

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStrArr = (v) =>
  Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string' && x.trim().length > 0);

/** 条目形状校验（singles 条目与组合 projects 条目同形状）；返回 name（形状不可用时 null） */
function checkEntryShape(label, entry, allowed, issues) {
  if (!isObj(entry)) {
    issues.push(`${label} 条目必须是对象（${allowed.join(' / ')}）`);
    return null;
  }
  for (const key of Object.keys(entry)) {
    if (!allowed.includes(key)) issues.push(`${label} 存在未知字段：${key}（允许 ${allowed.join(' / ')}）`);
  }
  if (typeof entry.name !== 'string' || entry.name.trim() === '') {
    issues.push(`${label} 缺少 name（字符串）`);
    return null;
  }
  if (typeof entry.description !== 'string' || entry.description.trim() === '') {
    issues.push(`"${entry.name}" 缺少一句话 description（${label}）`);
  }
  for (const field of ['language', 'framework']) {
    if (entry[field] === undefined) continue;
    if (!isStrArr(entry[field])) {
      issues.push(`"${entry.name}" 的 ${field} 必须是非空字符串数组（可省略）：${JSON.stringify(entry[field])}`);
    }
  }
  return entry.name;
}

async function main() {
  const issues = [];

  // ① registry.json 存在性 + 旧 registry.yaml 废弃检查
  const raw = await fs.readFile(path.join(repoDir, 'registry.json'), 'utf8').catch(() => null);
  if (raw === null) {
    console.error('✖ 缺少 registry.json（v2 起唯一注册中心为 registry.json）');
    process.exit(1);
  }
  if (await isFile(path.join(repoDir, 'registry.yaml'))) {
    issues.push('registry.yaml 已废弃（v2 起唯一注册中心为 registry.json），请删除该文件');
  }

  // ② 重复键扫描（先于解析：JSON.parse 会静默丢弃前者）
  for (const key of scanDupKeys(raw)) {
    issues.push(`registry.json 存在重复键：${key}（JSON 解析会静默取后者，必须去重）`);
  }

  // ③ JSON 解析（语法错误透传定位信息）
  let registry;
  try {
    registry = JSON.parse(raw);
  } catch (e) {
    console.error(`✖ registry.json 不是合法的 JSON：${e.message}`);
    process.exit(1);
  }
  if (!isObj(registry)) {
    console.error('✖ registry.json 顶层必须是对象');
    process.exit(1);
  }

  // ④ 顶层字段与 version
  for (const key of Object.keys(registry)) {
    if (!['$schema', 'version', 'singles', 'solutions'].includes(key)) {
      issues.push(`registry.json 顶层存在未知字段：${key}（允许 $schema / version / singles / solutions）`);
    }
  }
  if (registry.version !== 2) {
    issues.push(`version 必须为 2（当前：${JSON.stringify(registry.version) ?? 'undefined'}）`);
  }
  for (const section of ['singles', 'solutions']) {
    if (registry[section] !== undefined && !Array.isArray(registry[section])) {
      issues.push(`${section} 必须是数组（数组顺序 = 展示与生成顺序；可省略，省略视为空）`);
    }
  }

  // ⑤ 单例模板：名字 / 重复登记 / 目录派生 / 规范骨架
  const singleNames = new Set();
  for (const entry of Array.isArray(registry.singles) ? registry.singles : []) {
    const name = checkEntryShape('singles', entry, ENTRY_FIELDS, issues);
    if (name === null) continue;
    if (!NAME_RE.test(name)) {
      issues.push(`单例模板名 "${name}" 不符合规范 ^[a-z][a-z0-9-]*$`);
      continue;
    }
    if (singleNames.has(name)) {
      issues.push(`单例模板 "${name}" 重复登记（singles 数组内 name 必须唯一）`);
      continue;
    }
    singleNames.add(name);
    const dir = path.join(repoDir, 'singles', name);
    if (!(await isDir(dir))) {
      issues.push(`模板 ${name} 的目录不存在：singles/${name}/（目录由名字约定派生，registry 无 path 字段）`);
      continue;
    }
    await checkSkeleton(`模板 ${name}`, dir, issues);
  }

  // ⑥ 组合模板：名字全局唯一 / projects 形状与顺序 / 成员目录 / 双向一致
  const solutionsArr = Array.isArray(registry.solutions) ? registry.solutions : [];
  const solutionNames = new Set(
    solutionsArr.filter(isObj).map((s) => s.name).filter((n) => typeof n === 'string'),
  );
  const memberOwner = new Map(); // 成员名 → 归属组合（三段全局唯一命名空间）
  const seenSolutions = new Set();
  let memberCount = 0;
  for (const sol of solutionsArr) {
    const name = checkEntryShape('solutions', sol, SOLUTION_FIELDS, issues);
    if (name === null) continue;
    if (!NAME_RE.test(name)) {
      issues.push(`组合模板名 "${name}" 不符合规范 ^[a-z][a-z0-9-]*$`);
      continue;
    }
    if (singleNames.has(name)) {
      issues.push(`组合模板 "${name}" 与单例模板重名（组合与模板必须可区分）`);
      continue;
    }
    if (seenSolutions.has(name)) {
      issues.push(`组合模板 "${name}" 重复登记（solutions 数组内 name 必须唯一）`);
      continue;
    }
    seenSolutions.add(name);
    if (!Array.isArray(sol.projects) || sol.projects.length === 0) {
      issues.push(`组合模板 ${name} 缺少非空 projects 数组（成员条目与 singles 同形状，数组顺序 = 生成顺序）`);
      continue;
    }

    const declared = new Set();
    for (const proj of sol.projects) {
      const member = checkEntryShape(`组合模板 ${name} 的 projects`, proj, ENTRY_FIELDS, issues);
      if (member === null) continue;
      if (!NAME_RE.test(member)) {
        issues.push(`组合模板 ${name} 的成员项目名 "${member}" 不合法（须满足 ^[a-z][a-z0-9-]*$）`);
        continue;
      }
      if (declared.has(member)) {
        issues.push(`组合模板 ${name} 的成员 "${member}" 重复登记（projects 数组内 name 必须唯一）`);
        continue;
      }
      declared.add(member);
      memberCount++;

      // 成员目录必须实际存在（成员 = 组合专属完整模板骨架）
      const memberDir = path.join(repoDir, 'solutions', name, member);
      if (!(await isDir(memberDir))) {
        issues.push(`成员项目目录不存在：solutions/${name}/${member}/（目录由名字约定派生）`);
      }
      await checkSkeleton(`组合模板 ${name} 的成员 ${member}`, memberDir, issues);

      // 成员名全局唯一：平铺落盘 projects/ 后直接占用顶层目录名，与模板/组合/其他成员同空间
      if (singleNames.has(member)) {
        issues.push(
          `组合模板 ${name} 的成员名 "${member}" 与单例模板名冲突（成员平铺落盘 projects/ 会抢占目录名，三段全局唯一）`,
        );
      } else if (solutionNames.has(member)) {
        issues.push(`组合模板 ${name} 的成员名 "${member}" 与组合模板名冲突（三段全局唯一）`);
      } else {
        const owner = memberOwner.get(member);
        if (owner) {
          issues.push(`组合模板 ${name} 的成员名 "${member}" 与组合 ${owner} 的成员名冲突（三段全局唯一）`);
        } else {
          memberOwner.set(member, name);
        }
      }
    }

    // 反方向：组合名不得与任何已登记成员项目名重名（成员 vs 组合名全集已在上覆盖）
    const owner = memberOwner.get(name);
    if (owner) {
      issues.push(`组合模板名 "${name}" 与组合 ${owner} 的成员项目名冲突（三段全局唯一）`);
    }

    // 反向一致性：solutions/<组合>/ 下的子目录必须全部登记进 projects（防幽灵成员目录）
    const solDir = path.join(repoDir, 'solutions', name);
    if (await isDir(solDir)) {
      for (const ent of await fs.readdir(solDir, { withFileTypes: true })) {
        if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
        if (!declared.has(ent.name)) {
          issues.push(
            `目录 solutions/${name}/${ent.name}/ 未登记进组合 ${name} 的 projects（登记与成员目录须双向一致）`,
          );
        }
      }
    }
  }

  // ⑦ 反向完整性：singles/ 与 solutions/ 子目录必须全部登记（防幽灵静默不可用）
  const singlesRoot = path.join(repoDir, 'singles');
  if (await isDir(singlesRoot)) {
    for (const ent of await fs.readdir(singlesRoot, { withFileTypes: true })) {
      if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
      if (!singleNames.has(ent.name)) {
        issues.push(`目录 singles/${ent.name}/ 未在 registry.json 登记——新增单例模板请补登记`);
      }
    }
  }
  const solutionsRoot = path.join(repoDir, 'solutions');
  if (await isDir(solutionsRoot)) {
    for (const ent of await fs.readdir(solutionsRoot, { withFileTypes: true })) {
      if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
      if (!solutionNames.has(ent.name)) {
        issues.push(`目录 solutions/${ent.name}/ 未在 registry.json 登记——请补登记或删除该目录`);
      }
    }
  }

  // ⑧ 根一级目录白名单（布局目录 + 仓库自有目录 + 隐藏目录），其余报错
  for (const ent of await fs.readdir(repoDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    if (ent.name.startsWith('.') || ROOT_ALLOWED_DIRS.has(ent.name)) continue;
    issues.push(
      `根一级目录 ${ent.name}/ 不在布局白名单（singles/ solutions/ docs/ scripts/）——` +
        `单例模板移入 singles/，组合模板建 solutions/<组合>/<成员>/；确非模板目录则加入本脚本 ROOT_ALLOWED_DIRS`,
    );
  }

  if (issues.length > 0) {
    for (const issue of issues) console.error(`✖ ${issue}`);
    process.exit(1);
  }
  console.log(
    `✔ 注册中心一致：${singleNames.size} 个单例模板${solutionsArr.length > 0 ? `、${solutionsArr.length} 个组合（${memberCount} 个成员）` : ''}，无问题。`,
  );
}

main();
