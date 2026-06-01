/**
 * Input — paddle control: touch / mouse / keyboard unified.
 * Usage:
 *   Input.init(canvasEl, fieldWidth, paddleWidthGetter)
 *   Input.getX() → center x of paddle (0..fieldWidth)
 *   Input.destroy()
 */
const Input = (() => {
  let _canvas = null;
  let _fieldW = 0;
  let _getPaddleW = () => 100;
  let _x = 0;
  let _keys = { left: false, right: false };
  let _listeners = [];

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function canvasX(clientX) {
    const rect = _canvas.getBoundingClientRect();
    const scaleX = _fieldW / rect.width;
    return (clientX - rect.left) * scaleX;
  }

  function on(el, type, fn, opts) {
    el.addEventListener(type, fn, opts);
    _listeners.push({ el, type, fn });
  }

  function init(canvas, fieldWidth, paddleWidthGetter) {
    destroy();
    _canvas = canvas;
    _fieldW = fieldWidth;
    _getPaddleW = paddleWidthGetter || (() => 100);
    _x = fieldWidth / 2;

    // Touch
    on(canvas, 'touchmove', (e) => {
      e.preventDefault();
      _x = clamp(canvasX(e.touches[0].clientX), _getPaddleW() / 2, _fieldW - _getPaddleW() / 2);
    }, { passive: false });
    on(canvas, 'touchstart', (e) => {
      e.preventDefault();
      _x = clamp(canvasX(e.touches[0].clientX), _getPaddleW() / 2, _fieldW - _getPaddleW() / 2);
    }, { passive: false });

    // Mouse
    on(canvas, 'mousemove', (e) => {
      _x = clamp(canvasX(e.clientX), _getPaddleW() / 2, _fieldW - _getPaddleW() / 2);
    });

    // Keyboard
    on(window, 'keydown', (e) => {
      if (e.key === 'ArrowLeft') _keys.left = true;
      if (e.key === 'ArrowRight') _keys.right = true;
    });
    on(window, 'keyup', (e) => {
      if (e.key === 'ArrowLeft') _keys.left = false;
      if (e.key === 'ArrowRight') _keys.right = false;
    });
  }

  function update(dt) {
    const speed = _fieldW * 2.2; // px/s
    if (_keys.left) _x = clamp(_x - speed * dt, _getPaddleW() / 2, _fieldW - _getPaddleW() / 2);
    if (_keys.right) _x = clamp(_x + speed * dt, _getPaddleW() / 2, _fieldW - _getPaddleW() / 2);
  }

  function getX() { return _x; }
  function setX(val) { _x = val; }

  function destroy() {
    _listeners.forEach(({ el, type, fn }) => el.removeEventListener(type, fn));
    _listeners = [];
    _keys = { left: false, right: false };
  }

  return { init, update, getX, setX, destroy };
})();

export default Input;
