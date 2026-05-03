const fs = require('fs');
const path = require('path');

const vaultRoot = process.env.OBSIDIAN_VAULT_PATH
  ? path.resolve(process.env.OBSIDIAN_VAULT_PATH)
  : path.resolve(process.cwd(), 'memory-vault');
const memoryDir = path.join(vaultRoot, 'agent-memory');
const activeFileMarker = path.join(memoryDir, '.active-memory.txt');

const DEFAULT_SECTIONS = ['Profile', 'User Preferences', 'Learned Rules', 'Knowledge Base', 'Conversation Log'];

function slugify(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-zа-яіїєґ0-9\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'real-estate-agent-memory';
}

function ensureVault() {
  fs.mkdirSync(memoryDir, { recursive: true });
  if (!fs.existsSync(activeFileMarker)) {
    const def = 'real-estate-agent-memory.md';
    fs.writeFileSync(activeFileMarker, def, 'utf8');
  }
  const active = getActiveFilePath();
  if (!fs.existsSync(active)) {
    const base = ['# Real Estate Agent Memory', '', ...DEFAULT_SECTIONS.map((s) => `## ${s}\n`), ''].join('\n');
    fs.writeFileSync(active, base, 'utf8');
  }
}

function getActiveFileName() {
  ensureVault();
  return fs.readFileSync(activeFileMarker, 'utf8').trim();
}

function getActiveFilePath() {
  fs.mkdirSync(memoryDir, { recursive: true });
  const name = fs.existsSync(activeFileMarker)
    ? fs.readFileSync(activeFileMarker, 'utf8').trim()
    : 'real-estate-agent-memory.md';
  return path.join(memoryDir, name || 'real-estate-agent-memory.md');
}

function switchToBranch(branchTitle) {
  const filename = `${slugify(branchTitle)}.md`;
  fs.mkdirSync(memoryDir, { recursive: true });
  fs.writeFileSync(activeFileMarker, filename, 'utf8');
  ensureVault();
  return filename;
}


function listBranches() {
  ensureVault();
  return fs.readdirSync(memoryDir)
    .filter((f) => f.endsWith('.md'))
    .sort();
}

function getActiveBranchName() {
  return getActiveFileName();
}

function readMemoryFile() {
  ensureVault();
  return fs.readFileSync(getActiveFilePath(), 'utf8');
}

function writeMemoryFile(text) {
  fs.writeFileSync(getActiveFilePath(), text, 'utf8');
}

function ensureSection(sectionName) {
  const safeSection = String(sectionName || '').trim();
  if (!safeSection) return false;
  let text = readMemoryFile();
  if (!text.includes(`\n## ${safeSection}\n`)) {
    text = `${text.trimEnd()}\n\n## ${safeSection}\n`;
    writeMemoryFile(text + '\n');
  }
  return true;
}

function appendToSection(sectionName, line) {
  if (!ensureSection(sectionName)) return;
  const text = readMemoryFile();
  const marker = `## ${sectionName}\n`;
  const idx = text.indexOf(marker);
  if (idx < 0) return;
  const insertPos = idx + marker.length;
  const newText = `${text.slice(0, insertPos)}- ${line}\n${text.slice(insertPos)}`;
  writeMemoryFile(newText);
}

function detectLearningInstruction(userText = '', contextText = '') {
  const t = userText.trim();
  const createFileMatch = t.match(/(?:створи|создай|create)\s+(?:нов(?:ий|у)\s+)?(?:файл)\s+(?:в\s+обсідіан[іe]?|в\s+obsidian)?\s*(?:назви|name)?\s*(.+)/i);
  if (createFileMatch) return { type: 'new_branch', section: createFileMatch[1].trim() };

  const sectionMatch = t.match(/(?:створи|створимо|создай|create)\s+(?:нов(?:ий|у)\s+)?(?:розділ|секц(?:ію|ию)|гілк(?:у|а)|ветк(?:у|а)|branch)\s+(.+)/i)
    || t.match(/(?:додай|add)\s+section\s+(.+)/i);
  if (sectionMatch) return { type: 'new_branch', section: sectionMatch[1].trim() };

  if (/(?:створи|створимо|создай|create).*(?:obsidian|пам\'ят|memory)/i.test(t)) {
    return { type: 'new_branch', section: 'Strategic Learning' };
  }

  const forceKnowledgeLog = /(knowledge\s*log|knowledge\s*base|база\s*знань)/i.test(t) && /(додай|добав|запиши|впиши|add|write)/i.test(t);
  const learnMatch = forceKnowledgeLog || t.match(/(?:запам'?ятай|запомни|навчись|learn|будемо\s+навчатись|давай\s+навчатись|запиши\s+це|запиши\s+в)/i);
  if (learnMatch) {
    const writeThis = /^(?:так,?\s*)?(?:запиши\s+це)(?:\s+в.*)?$/i.test(t) || forceKnowledgeLog;
    const payload = writeThis
      ? (contextText || '').trim()
      : (t.replace(/^(?:запам'?ятай|запомни|навчись|learn|будемо\s+навчатись|давай\s+навчатись|запиши\s+це|запиши\s+в)\s*[:\-]?\s*/i, '').trim() || t);
    const profile = payload.match(/(?:мене звати|моє ім'?я|my name is)\s+(.+)/i);
    if (!payload) return { type: 'noop' };
    if (profile) return { type: 'learn', section: 'Profile', content: `Name: ${profile[1].trim()}` };
    if (/(подобає|подобається|люблю|не люблю|предпочитаю|prefer)/i.test(payload)) return { type: 'learn', section: 'User Preferences', content: payload };
    if (/(правило|завжди|ніколи|always|never)/i.test(payload)) return { type: 'learn', section: 'Learned Rules', content: payload };
    return { type: 'learn', section: forceKnowledgeLog ? 'Knowledge Base' : 'Knowledge Base', content: payload };
  }
  return null;
}

function handleLearningInstruction(userText = '', contextText = '') {
  const ins = detectLearningInstruction(userText, contextText);
  if (!ins) return null;
  if (ins.type === 'noop') return "Немає що записувати: дай текст або попроси 'запам'ятай: ...'.";

  if (ins.type === 'new_branch') {
    const file = switchToBranch(ins.section);
    return `Створив нову гілку пам'яті: "${ins.section}" (файл ${file}).`;
  }

  if (ins.type === 'learn') {
    appendToSection(ins.section, `${new Date().toISOString()} — ${ins.content}`);
    return `Записав у гілку "${getActiveFileName()}" розділ "${ins.section}".`;
  }
  return null;
}

function appendMemory({ userText, replyText, intent, listMode }) {
  appendToSection('Conversation Log', `${new Date().toISOString()} | user: ${userText}`);
  appendToSection('Conversation Log', `mode: ${listMode || 'n/a'} | intent: ${JSON.stringify(intent || {})}`);
  appendToSection('Conversation Log', `reply: ${String(replyText || '').slice(0, 800)}`);
}

function getRecentMemory(limit = 12) {
  try {
    const text = readMemoryFile();
    const logMatch = text.match(/## Conversation Log\n([\s\S]*)$/);
    return (logMatch?.[1] || '').split('\n').map((x) => x.trim()).filter((x) => x.startsWith('- ')).slice(-limit).join('\n');
  } catch {
    return '';
  }
}

// ─── Vault-wide search (читає всі .md файли у vault, не тільки agent-memory) ───

function listAllVaultFiles(dir = vaultRoot, found = []) {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        listAllVaultFiles(full, found);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        found.push(full);
      }
    }
  } catch { /* vault недоступний */ }
  return found;
}

/**
 * Шукає в усіх .md файлах vault секцію або абзац, що згадує jkQuery.
 * Повертає масив { file, excerpt } — перші 3 збіги.
 */
function searchVaultForJK(jkQuery = '') {
  if (!jkQuery) return [];
  const q = jkQuery.toLowerCase();
  const results = [];
  for (const filePath of listAllVaultFiles()) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      if (!raw.toLowerCase().includes(q)) continue;
      // Витягуємо абзаци/рядки навколо збігу
      const lines = raw.split('\n');
      const matchLines = [];
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(q)) {
          // беремо заголовок секції вище + 3 рядки контексту
          const from = Math.max(0, i - 1);
          const to = Math.min(lines.length - 1, i + 3);
          matchLines.push(lines.slice(from, to + 1).join('\n'));
        }
      }
      results.push({ file: path.relative(vaultRoot, filePath), excerpt: matchLines.join('\n---\n') });
      if (results.length >= 3) break;
    } catch { /* skip */ }
  }
  return results;
}

/**
 * Читає весь вміст файлу vault за частковим ім'ям або повним шляхом.
 * Напр. readVaultNote('його-опалення-в-жк') знайде будь-який файл що містить це в назві.
 */
function readVaultNote(nameFragment = '') {
  const frag = nameFragment.toLowerCase().replace(/\.md$/, '');
  for (const filePath of listAllVaultFiles()) {
    if (path.basename(filePath).toLowerCase().replace(/\.md$/, '').includes(frag)) {
      try { return { file: path.relative(vaultRoot, filePath), content: fs.readFileSync(filePath, 'utf8') }; } catch { return null; }
    }
  }
  return null;
}

/**
 * Знаходить файл з інфою про опалення ЖК (пошук по ключовим словам у назві файлу).
 */
function getHeatingNoteFromVault() {
  const keywords = ['опаленн', 'heating', 'жк-', '-жк', 'complexes', 'комплекс'];
  for (const filePath of listAllVaultFiles()) {
    const base = path.basename(filePath).toLowerCase();
    if (keywords.some((k) => base.includes(k))) {
      try { return { file: path.relative(vaultRoot, filePath), content: fs.readFileSync(filePath, 'utf8') }; } catch { return null; }
    }
  }
  return null;
}

module.exports = {
  appendMemory, getRecentMemory, vaultRoot, memoryDir,
  handleLearningInstruction, ensureSection, listBranches, getActiveBranchName,
  searchVaultForJK, readVaultNote, getHeatingNoteFromVault, listAllVaultFiles,
};
