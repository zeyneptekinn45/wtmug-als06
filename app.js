// ===== DOM referansları =====
const video = document.getElementById('video');
const cameraHint = document.getElementById('cameraHint');
const startCamBtn = document.getElementById('startCamBtn');
const captureBtn = document.getElementById('captureBtn');
const switchCamBtn = document.getElementById('switchCamBtn');
const pickImageBtn = document.getElementById('pickImageBtn');
const fileInput = document.getElementById('fileInput');
const galleryPreview = document.getElementById('galleryPreview');
const manualText = document.getElementById('manualText');
const manualTranslateBtn = document.getElementById('manualTranslateBtn');
const targetLang = document.getElementById('targetLang');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const resultSection = document.getElementById('resultSection');
const sourceText = document.getElementById('sourceText');
const translatedText = document.getElementById('translatedText');
const detectedLang = document.getElementById('detectedLang');
const resultLang = document.getElementById('resultLang');
const copyBtn = document.getElementById('copyBtn');
const speakBtn = document.getElementById('speakBtn');
const errorMsg = document.getElementById('errorMsg');
const installBtn = document.getElementById('installBtn');

// ===== Durum =====
let mediaStream = null;
let facingMode = 'environment';
let currentTranslation = '';
let deferredPrompt = null;

// ===== Sekme geçişi =====
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
    hideError();
  });
});

// ===== Yardımcılar =====
function showLoading(text = 'İşleniyor…') {
  loadingText.textContent = text;
  loading.hidden = false;
}
function setLoadingText(text) { loadingText.textContent = text; }
function hideLoading() { loading.hidden = true; }
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
}
function hideError() { errorMsg.hidden = true; }

function langName(code) {
  const map = {
    tr: 'Türkçe', en: 'İngilizce', de: 'Almanca', fr: 'Fransızca',
    es: 'İspanyolca', it: 'İtalyanca', ru: 'Rusça', ar: 'Arapça',
    ja: 'Japonca', 'zh-CN': 'Çince (Basit)', ko: 'Korece',
    pt: 'Portekizce', nl: 'Felemenkçe'
  };
  return map[code] || code;
}

function displayResult(sourceTxt, detectedL, translatedTxt, targetL) {
  sourceText.textContent = sourceTxt || '(metin bulunamadı)';
  translatedText.textContent = translatedTxt || '(çeviri yok)';
  detectedLang.textContent = langName(detectedL);
  resultLang.textContent = langName(targetL);
  currentTranslation = translatedTxt || '';
  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== Kamera =====
async function startCamera() {
  try {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
    }
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    video.srcObject = mediaStream;
    await video.play();
    cameraHint.style.display = 'none';
    captureBtn.disabled = false;
    switchCamBtn.disabled = false;
    startCamBtn.textContent = 'Kamerayı Yeniden Başlat';
  } catch (err) {
    console.error('Kamera hatası:', err);
    showError('Kameraya erişilemedi. Tarayıcı izinlerini kontrol edin. (HTTPS gerekli)');
  }
}

startCamBtn.addEventListener('click', startCamera);

switchCamBtn.addEventListener('click', () => {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  startCamera();
});

captureBtn.addEventListener('click', async () => {
  hideError();
  if (!mediaStream || video.videoWidth === 0) {
    showError('Kamera hazır değil.');
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  await processImage(canvas);
});

// ===== Galeri =====
pickImageBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  hideError();
  const url = URL.createObjectURL(file);
  galleryPreview.innerHTML = `<img src="${url}" alt="Seçilen görsel" />`;
  await processImage(file);
  fileInput.value = '';
});

// ===== Manuel çeviri =====
manualTranslateBtn.addEventListener('click', async () => {
  hideError();
  const text = manualText.value.trim();
  if (!text) {
    showError('Lütfen bir metin girin.');
    return;
  }
  await runTranslation(text, 'auto');
});

// ===== Ana akış: görüntü → OCR → çeviri =====
async function processImage(source) {
  try {
    showLoading('OCR motoru hazırlanıyor…');

    const ocrResult = await recognizeText(source);

    if (!ocrResult.text) {
      hideLoading();
      showError('Görselde okunabilir metin bulunamadı. Daha net bir görsel deneyin veya klavyeyle giriş yapın.');
      return;
    }

    await runTranslation(ocrResult.text, ocrResult.lang);
  } catch (err) {
    console.error(err);
    hideLoading();
    showError(`OCR hatası: ${err.message}`);
  }
}

async function runTranslation(text, sourceLang) {
  const target = targetLang.value;
  try {
    showLoading('Çeviri yapılıyor…');
    const { text: translated } = await translateText(text, sourceLang, target);
    hideLoading();
    displayResult(text, sourceLang, translated, target);
  } catch (err) {
    hideLoading();
    showError(err.message);
  }
}

// ===== Kopyala / Dinle =====
copyBtn.addEventListener('click', async () => {
  if (!currentTranslation) return;
  try {
    await navigator.clipboard.writeText(currentTranslation);
    copyBtn.textContent = '✅ Kopyalandı';
    setTimeout(() => (copyBtn.textContent = '📋 Kopyala'), 1500);
  } catch { showError('Kopyalama başarısız.'); }
});

speakBtn.addEventListener('click', () => {
  if (!currentTranslation) return;
  const u = new SpeechSynthesisUtterance(currentTranslation);
  u.lang = targetLang.value;
  speechSynthesis.speak(u);
});

// ===== PWA kurulum =====
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

// ===== Service Worker kayıt =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => console.log('SW kayıtlı:', reg.scope))
      .catch((err) => console.warn('SW kaydı başarısız:', err));
  });
}