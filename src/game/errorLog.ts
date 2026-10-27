/**
 * Errors go to the browser console and, with ?debug in the URL, to a small on-screen log.
 */
export function installErrorLog(): void {
  if (!new URLSearchParams(location.search).has('debug')) return;
  const box = document.createElement('pre');
  box.style.cssText =
    'position:fixed;left:0;right:0;bottom:0;max-height:30%;overflow:auto;margin:0;padding:6px;' +
    'font:11px monospace;color:#ffb4b4;background:rgba(0,0,0,.75);z-index:9;pointer-events:none;white-space:pre-wrap';
  box.textContent = 'debug log\n';
  document.body.appendChild(box);
  const add = (msg: string) => {
    box.textContent += msg + '\n';
    box.scrollTop = box.scrollHeight;
  };
  window.addEventListener('error', (e) => add(`${e.message} @ ${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => add(`promise: ${String(e.reason)}`));
}
