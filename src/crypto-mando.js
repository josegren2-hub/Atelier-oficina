/** Browser AES-GCM + PBKDF2-SHA256 (310000) helpers matching Oficina-bots mando.js. No keys stored here. */
const b64ToBytes = value => {
  if (typeof atob === 'function') return Uint8Array.from(atob(value), c => c.charCodeAt(0));
  return Uint8Array.from(Buffer.from(value, 'base64'));
};
const bytesToB64 = bytes => {
  const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  if (typeof btoa === 'function') {
    let s = '';
    for (const b of arr) s += String.fromCharCode(b);
    return btoa(s);
  }
  return Buffer.from(arr).toString('base64');
};

export function assertEncEnvelope(enc) {
  if (!enc || enc.v !== 1 || enc.kdf !== 'PBKDF2-SHA256' || !Number.isFinite(enc.iter) || enc.iter < 100000) {
    throw new Error('Sobre cifrado no reconocido');
  }
  for (const key of ['salt', 'iv', 'ct']) {
    if (typeof enc[key] !== 'string' || !enc[key]) throw new Error('Sobre cifrado incompleto');
  }
}

export async function deriveMandoKey(passphrase, enc, subtle = globalThis.crypto?.subtle) {
  if (!subtle) throw new Error('Web Crypto no disponible');
  assertEncEnvelope(enc);
  if (typeof passphrase !== 'string' || !passphrase) throw new Error('Frase vacía');
  const material = await subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    {name: 'PBKDF2', salt: b64ToBytes(enc.salt), iterations: enc.iter, hash: 'SHA-256'},
    material,
    {name: 'AES-GCM', length: 256},
    true,
    ['decrypt']
  );
}

export async function decryptEncJson(key, enc, subtle = globalThis.crypto?.subtle) {
  if (!subtle) throw new Error('Web Crypto no disponible');
  assertEncEnvelope(enc);
  const plain = await subtle.decrypt({name: 'AES-GCM', iv: b64ToBytes(enc.iv)}, key, b64ToBytes(enc.ct));
  return JSON.parse(new TextDecoder().decode(plain));
}

export async function exportRawKey(key, subtle = globalThis.crypto?.subtle) {
  return bytesToB64(await subtle.exportKey('raw', key));
}

export async function importRawKey(b64, subtle = globalThis.crypto?.subtle) {
  return subtle.importKey('raw', b64ToBytes(b64), 'AES-GCM', true, ['decrypt']);
}

export {b64ToBytes, bytesToB64};
