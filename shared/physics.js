/**
 * Physics — simple ball reflection math. No dependencies.
 *
 * Ball: { x, y, vx, vy, r }
 * Usage:
 *   Physics.reflectWalls(ball, fieldW, fieldH)   → mutates ball
 *   Physics.reflectPaddle(ball, paddleX, paddleY, paddleW, paddleH) → bool (hit?)
 *   Physics.step(ball, dt) → mutates x,y
 */
const Physics = (() => {
  function step(ball, dt) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
  }

  function reflectWalls(ball, fieldW) {
    let hit = false;
    if (ball.x - ball.r < 0) {
      ball.x = ball.r;
      ball.vx = Math.abs(ball.vx);
      hit = true;
    } else if (ball.x + ball.r > fieldW) {
      ball.x = fieldW - ball.r;
      ball.vx = -Math.abs(ball.vx);
      hit = true;
    }
    if (ball.y - ball.r < 0) {
      ball.y = ball.r;
      ball.vy = Math.abs(ball.vy);
      hit = true;
    }
    return hit;
  }

  // Returns true if ball hits paddle this frame, mutates vy
  function reflectPaddle(ball, paddleX, paddleY, paddleW, paddleH) {
    const hw = paddleW / 2;
    const hh = paddleH / 2;
    if (
      ball.x + ball.r > paddleX - hw &&
      ball.x - ball.r < paddleX + hw &&
      ball.y + ball.r > paddleY - hh &&
      ball.y - ball.r < paddleY + hh &&
      ball.vy > 0
    ) {
      ball.y = paddleY - hh - ball.r;
      // Angle based on hit position (-1..1 → -60..60 deg)
      const rel = (ball.x - paddleX) / hw; // -1..1
      const angle = rel * (Math.PI / 3); // ±60°
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.abs(Math.cos(angle) * speed);
      return true;
    }
    return false;
  }

  // AABB overlap test for item pickup
  function circleRect(ball, rx, ry, rw, rh) {
    const cx = Math.max(rx, Math.min(ball.x, rx + rw));
    const cy = Math.max(ry, Math.min(ball.y, ry + rh));
    const dx = ball.x - cx;
    const dy = ball.y - cy;
    return dx * dx + dy * dy < ball.r * ball.r;
  }

  return { step, reflectWalls, reflectPaddle, circleRect };
})();

export default Physics;
