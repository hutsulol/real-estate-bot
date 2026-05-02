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

function detectLearningInstruction(userText = '') {
  const t = userText.trim();
  const sectionMatch = t.match(/(?:створи|створимо|создай|create)\s+(?:нов(?:ий|у)\s+)?(?:розділ|секц(?:ію|ию)|гілк(?:у|а)|ветк(?:у|а)|branch)\s+(.+)/i)
    || t.match(/(?:додай|add)\s+section\s+(.+)/i);
  if (sectionMatch) return { type: 'new_branch', section: sectionMatch[1].trim() };

  if (/(?:створи|створимо|создай|create).*(?:obsidian|пам\'ят|memory)/i.test(t)) {
    return { type: 'new_branch', section: 'Strategic Learning' };
  }

  const learnMatch = t.match(/(?:запам'?ятай|запомни|навчись|learn|будемо\s+навчатись|давай\s+навчатись|запиши\s+це|запиши\s+в)/i);
  if (learnMatch) {
    const payload = t.replace(/^(?:запам'?ятай|запомни|навчись|learn|будемо\s+навчатись|давай\s+навчатись|запиши\s+це|запиши\s+в)\s*[:\-]?\s*/i, '').trim() || t;
    const profile = payload.match(/(?:мене звати|моє ім'?я|my name is)\s+(.+)/i);
    if (profile) return { type: 'learn', section: 'Profile', content: `Name: ${profile[1].trim()}` };
    if (/(подобає|подобається|люблю|не люблю|предпочитаю|prefer)/i.test(payload)) return { type: 'learn', section: 'User Preferences', content: payload };
    if (/(правило|завжди|ніколи|always|never)/i.test(payload)) return { type: 'learn', section: 'Learned Rules', content: payload };
    return { type: 'learn', section: 'Knowledge Base', content: payload };
  }
  return null;
}

function handleLearningInstruction(userText = '') {
  const ins = detectLearningInstruction(userText);
  if (!ins) return null;

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

module.exports = { appendMemory, getRecentMemory, vaultRoot, memoryDir, handleLearningInstruction, ensureSection };
