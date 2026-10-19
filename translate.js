/**
 * Çeviri katmanı:
 * 1) MyMemory (API anahtarsız, ücretsiz, günlük limitli)
 * 2) LibreTranslate public instance fallback
 */

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
const LIBRE_ENDPOINTS = [
  'https://translate.terraprint.co/translate',
  'https://libretranslate.de/translate',
  'https://translate.argosopentech.com/translate'
];

function mapLang(code) {
  // MyMemory 2 harfli kodları kullanır; zh-CN -> zh
  if (code === 'zh-CN') return 'zh';
  return code;
}

async function translateText(text, sourceLang, targetLang) {
  if (!text || !text.trim()) return { text: '', provider: '-' };

  const src = sourceLang ? mapLang(sourceLang) : 'auto';
  const tgt = mapLang(targetLang);

  // 1) MyMemory
  try {
    const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=${src}|${tgt}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const translated = json?.responseData?.translatedText;
      if (translated && !/MYMEMORY WARNING|INVALID/i.test(translated)) {
        return { text: translated, provider: 'MyMemory' };
      }
    }
  } catch (e) {
    console.warn('MyMemory hatası:', e);
  }

  // 2) LibreTranslate instance'larını dene
  for (const endpoint of LIBRE_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: sourceLang === 'auto' ? 'auto' : sourceLang,
          target: targetLang,
          format: 'text'
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.translatedText) {
          return { text: json.translatedText, provider: endpoint };
        }
      }
    } catch (e) {
      console.warn('LibreTranslate hatası:', endpoint, e);
    }
  }

  throw new Error('Tüm çeviri servisleri başarısız oldu. İnternet bağlantınızı kontrol edin.');
}