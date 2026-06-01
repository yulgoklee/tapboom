/**
 * Ads — H5 Games Ad Placement API wrapper.
 * Frequency-controlled. Never violates AdSense policy.
 * Usage:
 *   Ads.init()
 *   Ads.interstitial()   — on game over / entry
 *   Ads.onResume(fn)     — called when ad closes, resume game
 */
const Ads = (() => {
  let _onResume = null;
  let _lastShown = 0;
  const MIN_INTERVAL_MS = 30000; // 30s minimum between interstitials
  let _gameOverCount = 0;
  const SHOW_EVERY_N_DEATHS = 2; // show every 2 deaths, not every one

  function init() {
    // H5 Games Ads SDK integration point
    // When SDK is present, it calls adBreak() etc.
    // We register a no-op if SDK not loaded (dev mode)
    if (typeof adBreak === 'undefined') {
      window.adBreak = window.adConfig = () => {};
    }
    try {
      window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
    } catch (e) { /* ignore in dev */ }
  }

  function onResume(fn) { _onResume = fn; }

  function interstitial(reason = 'start') {
    const now = Date.now();
    if (reason === 'gameover') {
      _gameOverCount++;
      if (_gameOverCount % SHOW_EVERY_N_DEATHS !== 0) return;
    }
    if (now - _lastShown < MIN_INTERVAL_MS) return;
    _lastShown = now;
    try {
      window.adBreak({
        type: 'interstitial',
        name: `tapboom_${reason}`,
        beforeAd: () => { /* pause game externally */ },
        afterAd: () => { if (_onResume) _onResume(); },
        adBreakDone: () => {},
      });
    } catch (e) { if (_onResume) _onResume(); }
  }

  return { init, onResume, interstitial };
})();

export default Ads;
