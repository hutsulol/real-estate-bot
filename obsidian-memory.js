const fs = require('fs');
const path = require('path');

const vaultRoot = process.env.OBSIDIAN_VAULT_PATH
  ? path.resolve(process.env.OBSIDIAN_VAULT_PATH)
  : path.resolve(process.cwd(), 'memory-vault');
const filePath = path.join(vaultRoot, 'real-estate-agent-memory.md');

function ensureVault() {
  fs.mkdirSync(vaultRoot, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '# Real Estate Agent Memory\n\n', 'utf8');
  }
}

function appendMemory({ userText, replyText, intent, listMode }) {
  ensureVault();
  const ts = new Date().toISOString();
  const block = [
    `## ${ts}`,
    `- user: ${userText}`,
    `- mode: ${listMode || 'n/a'}`,
    `- intent: ${JSON.stringify(intent || {})}`,
    `- reply: ${String(replyText || '').slice(0, 800)}`,
    '',
  ].join('\n');
  fs.appendFileSync(filePath, block, 'utf8');
}

function getRecentMemory(limit = 6) {
  try {
    ensureVault();
    const text = fs.readFileSync(filePath, 'utf8');
    const chunks = text.split('\n## ').filter(Boolean).slice(-limit);
    return chunks.map((c, i) => (i === 0 && c.startsWith('Real Estate Agent Memory') ? '' : c)).filter(Boolean).join('\n## ');
  } catch {
    return '';
  }
}

module.exports = { appendMemory, getRecentMemory, vaultRoot, filePath };
