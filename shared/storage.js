/**
 * Storage — localStorage best-score helper.
 * Usage: Storage.getBest('ballstorm'), Storage.setBest('ballstorm', 9999)
 */
const Storage = (() => {
  const key = (gameId) => `tapboom_best_${gameId}`;

  function getBest(gameId) {
    const v = localStorage.getItem(key(gameId));
    return v ? parseInt(v, 10) : 0;
  }

  function setBest(gameId, score) {
    const prev = getBest(gameId);
    if (score > prev) {
      localStorage.setItem(key(gameId), String(score));
      return true; // new best
    }
    return false;
  }

  return { getBest, setBest };
})();

export default Storage;
