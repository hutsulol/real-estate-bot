const fs = require('fs');
const path = require('path');

const vaultRoot = process.env.OBSIDIAN_VAULT_PATH
  ? path.resolve(process.env.OBSIDIAN_VAULT_PATH)
  : path.resolve(process.cwd(), 'memory-vault');
const filePath = path.join(vaultRoot, 'real-estate-agent-memory.md');

const DEFAULT_SECTIONS = ['Profile', 'User Preferences', 'Learned Rules', 'Knowledge Base', 'Conversation Log'];

function ensureVault() {
  fs.mkdirSync(vaultRoot, { recursive: true });
  if (!fs.existsSync(filePath)) {
    const base = ['# Real Estate Agent Memory', '', ...DEFAULT_SECTIONS.map((s) => `## ${s}\n`), ''].join('\n');
    fs.writeFileSync(filePath, base, 'utf8');
  }
}

function readMemoryFile() {
  ensureVault();
  return fs.readFileSync(filePath, 'utf8');
}

function writeMemoryFile(text) {
  fs.writeFileSync(filePath, text, 'utf8');
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
  const sectionMatch = t.match(/(?:створи|создай)\s+розділ\s+(.+)/i) || t.match(/(?:додай|add)\s+section\s+(.+)/i);
  if (sectionMatch) return { type: 'new_section', section: sectionMatch[1].trim() };

  const learnMatch = t.match(/(?:запам'?ятай|запомни|навчись|learn)\s*[:\-]?\s*(.+)/i);
  if (learnMatch) {
    const payload = learnMatch[1].trim();
    const profile = payload.match(/(?:мене звати|моє ім'?я|my name is)\s+(.+)/i);
    if (profile) return { type: 'learn', section: 'Profile', content: `Name: ${profile[1].trim()}` };
    if (/(подобає|подобається|люблю|не люблю|предпочитаю|prefer)/i.test(payload)) {
      return { type: 'learn', section: 'User Preferences', content: payload };
    }
    if (/(правило|завжди|ніколи|always|never)/i.test(payload)) {
      return { type: 'learn', section: 'Learned Rules', content: payload };
    }
    return { type: 'learn', section: 'Knowledge Base', content: payload };
  }
  return null;
}

function handleLearningInstruction(userText = '') {
  const ins = detectLearningInstruction(userText);
  if (!ins) return null;

  if (ins.type === 'new_section') {
    ensureSection(ins.section);
    return `Створив новий розділ пам'яті: "${ins.section}".`;
  }

  if (ins.type === 'learn') {
    appendToSection(ins.section, `${new Date().toISOString()} — ${ins.content}`);
    return `Запам'ятав у розділ "${ins.section}".`;
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
    const lines = (logMatch?.[1] || '')
      .split('\n')
      .map((x) => x.trim())
      .filter((x) => x.startsWith('- '))
      .slice(-limit);
    return lines.join('\n');
  } catch {
    return '';
  }
}

module.exports = { appendMemory, getRecentMemory, vaultRoot, filePath, handleLearningInstruction, ensureSection };
