/** Clip a received text to one or two clean lines. Never cuts mid-word. */
export function clipPhrase(text, max = 160) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  if (raw.length <= max) return raw;
  const window = raw.slice(0, max);
  const sentence = window.match(/^(.*?[.!?…])(\s|$)/)?.[1]?.trim();
  if (sentence && sentence.length >= Math.min(40, Math.floor(max * 0.4))) return sentence;
  const sp = window.lastIndexOf(' ');
  const cut = (sp >= 40 ? window.slice(0, sp) : window).replace(/[.,;:]+$/, '').trim();
  return `${cut}…`;
}

/** If activity and current task are the same text, keep a single row. */
export function dedupeFactRows(rows) {
  const list = Array.isArray(rows) ? rows.filter(r => r && r[1]) : [];
  const act = list.find(r => r[2] === 'activity');
  const cur = list.find(r => r[2] === 'current');
  if (act && cur) {
    const a = String(act[1]).replace(/\s+/g, ' ').trim().toLowerCase();
    const c = String(cur[1]).replace(/\s+/g, ' ').trim().toLowerCase();
    if (a && a === c) return list.filter(r => r[2] !== 'current');
  }
  return list;
}
