let ocrWorker = null;

async function getOcrWorker() {
  if (ocrWorker) return ocrWorker;

  // İlk önce yalnızca 2 dil yükleyin, akışın çalıştığını doğrulayın
  ocrWorker = await Tesseract.createWorker('eng+tur', 1, {
    logger: (m) => {
      if (m.status) {
        const pct = m.progress ? Math.round(m.progress * 100) : 0;
        setLoadingText(`${m.status}… ${pct}%`);
      }
    }
    // workerPath/corePath/langPath'i ÖZELLİKLE yapılandırmayın, varsayılan CDN kullanın
  });
  return ocrWorker;
}