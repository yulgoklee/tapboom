/**
 * GameShell — start / game-over / clear / restart UI overlay + sound toggle.
 * Injects DOM over the canvas. Game calls show/hide methods.
 * Usage:
 *   GameShell.init({ onStart, onRestart, onSoundToggle })
 *   GameShell.showGameOver(score, best, isNewBest)
 *   GameShell.showClear(score, best, isNewBest)
 *   GameShell.hide()
 */
const GameShell = (() => {
  let _overlay = null;
  let _soundBtn = null;
  let _callbacks = {};

  const css = `
    #gs-overlay {
      position: fixed; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: rgba(8,4,28,0.88); z-index: 100;
      font-family: 'Arial Black', Arial, sans-serif;
      color: #fff; text-align: center; padding: 24px;
      transition: opacity 0.2s;
    }
    #gs-overlay.hidden { display: none; }
    #gs-title { font-size: clamp(32px, 8vw, 64px); font-weight: 900;
      letter-spacing: 2px; margin-bottom: 8px; }
    #gs-subtitle { font-size: clamp(14px, 3.5vw, 22px); color: #aaa;
      margin-bottom: 24px; }
    #gs-score { font-size: clamp(48px, 12vw, 96px); font-weight: 900;
      line-height: 1; color: #fff; }
    #gs-best { font-size: clamp(14px, 3.5vw, 22px); color: #ffd700;
      margin-top: 6px; min-height: 28px; }
    #gs-new-best { font-size: clamp(18px, 4.5vw, 32px); font-weight: 900;
      color: #00ff88; animation: pulse 0.5s infinite alternate; }
    @keyframes pulse { from { transform: scale(1); } to { transform: scale(1.08); } }
    #gs-btn {
      margin-top: 28px; padding: 16px 48px;
      font-size: clamp(18px, 4.5vw, 28px); font-weight: 900;
      background: #7c3aed; color: #fff; border: none; border-radius: 999px;
      cursor: pointer; letter-spacing: 1px;
      box-shadow: 0 0 24px #7c3aed88;
      transition: transform 0.1s, box-shadow 0.1s;
    }
    #gs-btn:active { transform: scale(0.96); box-shadow: 0 0 8px #7c3aed44; }
    #gs-sound {
      position: fixed; top: 14px; right: 16px; z-index: 110;
      background: rgba(255,255,255,0.08); border: 1.5px solid rgba(255,255,255,0.18);
      border-radius: 50%; width: 40px; height: 40px; font-size: 20px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    #gs-sound:active { background: rgba(255,255,255,0.2); }
  `;

  function init({ onStart, onRestart, onSoundToggle } = {}) {
    _callbacks = { onStart, onRestart, onSoundToggle };

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Sound toggle (always visible)
    _soundBtn = document.createElement('button');
    _soundBtn.id = 'gs-sound';
    _soundBtn.textContent = '🔇';
    _soundBtn.setAttribute('aria-label', 'Toggle sound');
    _soundBtn.addEventListener('click', () => {
      const on = _callbacks.onSoundToggle && _callbacks.onSoundToggle();
      _soundBtn.textContent = on ? '🔊' : '🔇';
    });
    document.body.appendChild(_soundBtn);

    // Overlay
    _overlay = document.createElement('div');
    _overlay.id = 'gs-overlay';
    document.body.appendChild(_overlay);

    showStart();
  }

  function showStart() {
    _overlay.classList.remove('hidden');
    _overlay.innerHTML = `
      <div id="gs-title">⚡ BALL STORM</div>
      <div id="gs-subtitle">Tap to dodge. Grab items. Chain combos.</div>
      <div id="gs-best"></div>
      <button id="gs-btn">TAP TO PLAY</button>
    `;
    document.getElementById('gs-btn').addEventListener('click', () => {
      hide();
      if (_callbacks.onStart) _callbacks.onStart();
    });
  }

  function showGameOver(score, best, isNewBest) {
    _overlay.classList.remove('hidden');
    _overlay.innerHTML = `
      <div id="gs-title" style="color:#ff4466;">GAME OVER</div>
      <div id="gs-score">${score.toLocaleString()}</div>
      <div id="gs-best">${isNewBest
        ? '<span id="gs-new-best">★ NEW BEST!</span>'
        : `BEST: ${best.toLocaleString()}`}
      </div>
      <button id="gs-btn">PLAY AGAIN</button>
    `;
    document.getElementById('gs-btn').addEventListener('click', () => {
      hide();
      if (_callbacks.onRestart) _callbacks.onRestart();
    });
  }

  function showClear(score, best, isNewBest) {
    _overlay.classList.remove('hidden');
    _overlay.innerHTML = `
      <div id="gs-title" style="color:#00ff88;">YOU WIN! 🎉</div>
      <div id="gs-subtitle">All bricks destroyed!</div>
      <div id="gs-score">${score.toLocaleString()}</div>
      <div id="gs-best">${isNewBest
        ? '<span id="gs-new-best">★ NEW BEST!</span>'
        : `BEST: ${best.toLocaleString()}`}
      </div>
      <button id="gs-btn">PLAY AGAIN</button>
    `;
    document.getElementById('gs-btn').addEventListener('click', () => {
      hide();
      if (_callbacks.onRestart) _callbacks.onRestart();
    });
  }

  function hide() {
    _overlay.classList.add('hidden');
  }

  return { init, showStart, showGameOver, showClear, hide };
})();

export default GameShell;
