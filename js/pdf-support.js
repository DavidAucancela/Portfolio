/* ¿El navegador muestra un PDF dentro de un <iframe>?
   - iOS / iPadOS: solo pinta la primera página como imagen, sin scroll.
   - Android (Chrome, Samsung…): no tiene visor embebido — iframe en blanco.
   - navigator.pdfViewerEnabled === false: el visor está desactivado.
   Donde no se puede, PDFModal abre el archivo en el visor nativo y la
   gallery muestra una tarjeta con "Abrir PDF" / "Descargar". */
const ua = navigator.userAgent;
const isIOS = /iPad|iPhone|iPod/.test(ua)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS se anuncia como Mac
const isAndroid = /Android/i.test(ua);

export const canEmbedPdf = !isIOS && !isAndroid && navigator.pdfViewerEnabled !== false;
