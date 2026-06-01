/**
 * FX — PixiJS particle effects, screen shake, number popups, flash.
 * Requires PixiJS app to be passed in on init.
 * Usage:
 *   FX.init(pixiApp, fieldW, fieldH)
 *   FX.burst(x, y, color, count)
 *   FX.flash(x, y)
 *   FX.shake(intensity)
 *   FX.popup(x, y, text, color)
 *   FX.update(dt)  — call every frame
 */
const FX = (() => {
  let _app = null;
  let _container = null;
  let _fieldW = 0;
  let _fieldH = 0;
  let _shakeT = 0;
  let _shakeI = 0;
  let _particles = [];
  let _popups = [];
  let _quality = 1; // 0.5 on low-end

  function init(app, fieldW, fieldH, quality = 1) {
    _app = app;
    _fieldW = fieldW;
    _fieldH = fieldH;
    _quality = quality;
    _container = new PIXI.Container();
    app.stage.addChild(_container);
  }

  function setQuality(q) { _quality = q; }

  function burst(x, y, color, count = 8) {
    const n = Math.round(count * _quality);
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const speed = 80 + Math.random() * 120;
      const g = new PIXI.Graphics();
      g.beginFill(color);
      const size = 2 + Math.random() * 3;
      g.drawCircle(0, 0, size);
      g.endFill();
      g.x = x;
      g.y = y;
      _container.addChild(g);
      _particles.push({
        g, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.2, maxLife: 0.6,
      });
    }
  }

  function flash(x, y, color = 0xffffff) {
    if (_quality < 0.7) return;
    const g = new PIXI.Graphics();
    g.beginFill(color, 0.8);
    g.drawCircle(0, 0, 18);
    g.endFill();
    g.x = x;
    g.y = y;
    _container.addChild(g);
    _particles.push({ g, vx: 0, vy: 0, life: 0.12, maxLife: 0.12, scale: true });
  }

  function shake(intensity = 8) {
    if (_quality < 0.5) return;
    _shakeI = intensity * _quality;
    _shakeT = 0.25;
  }

  function popup(x, y, text, color = 0xffffff) {
    if (!_app) return;
    const style = new PIXI.TextStyle({
      fontFamily: 'Arial Black, Arial Bold, Arial',
      fontSize: 22,
      fontWeight: '900',
      fill: color,
      stroke: 0x000000,
      strokeThickness: 3,
      dropShadow: false,
    });
    const t = new PIXI.Text(text, style);
    t.anchor.set(0.5);
    t.x = x;
    t.y = y;
    _container.addChild(t);
    _popups.push({ t, vy: -90, life: 0.7 });
  }

  function update(dt) {
    // Shake
    if (_shakeT > 0) {
      _shakeT -= dt;
      const s = _shakeI * (_shakeT / 0.25);
      _app.stage.x = (Math.random() - 0.5) * s * 2;
      _app.stage.y = (Math.random() - 0.5) * s * 2;
    } else {
      _app.stage.x = 0;
      _app.stage.y = 0;
    }

    // Particles
    for (let i = _particles.length - 1; i >= 0; i--) {
      const p = _particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        _container.removeChild(p.g);
        p.g.destroy();
        _particles.splice(i, 1);
        continue;
      }
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.vy += 200 * dt; // gravity
      const ratio = p.life / p.maxLife;
      p.g.alpha = ratio;
      if (p.scale) p.g.scale.set(1 + (1 - ratio) * 2);
    }

    // Popups
    for (let i = _popups.length - 1; i >= 0; i--) {
      const p = _popups[i];
      p.life -= dt;
      if (p.life <= 0) {
        _container.removeChild(p.t);
        p.t.destroy();
        _popups.splice(i, 1);
        continue;
      }
      p.t.y += p.vy * dt;
      p.t.alpha = Math.min(1, p.life / 0.2);
    }
  }

  function destroy() {
    _particles.forEach(p => { _container.removeChild(p.g); p.g.destroy(); });
    _popups.forEach(p => { _container.removeChild(p.t); p.t.destroy(); });
    _particles = [];
    _popups = [];
    if (_container) { _container.parent && _container.parent.removeChild(_container); _container.destroy(); }
  }

  return { init, setQuality, burst, flash, shake, popup, update, destroy };
})();

export default FX;
