const SVG_NS = 'http://www.w3.org/2000/svg';
const CELL = 94; // Matches --cell in styles.css.
const CELLS_PER_SECOND = 24;
const BOUNCE = 16;

export function symbolSvg(symbol, label) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'sym');
  svg.dataset.symbol = symbol;
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#gg-${symbol}`);
  svg.append(use);
  return svg;
}

function cell(symbol) {
  const div = document.createElement('div');
  div.className = 'cell';
  div.append(symbolSvg(symbol));
  return div;
}

// One reel on screen. `strip` is the reel's symbol order and `stop` the
// position on its middle row.
export function createReel(el, strip, stop) {
  const stripEl = el.querySelector('.strip');
  const at = (i) => strip[((i % strip.length) + strip.length) % strip.length];
  const windowAt = (s) => [at(s - 1), at(s), at(s + 1)];

  function rest(s) {
    stop = s;
    stripEl.style.transform = '';
    stripEl.replaceChildren(...windowAt(s).map(cell));
  }
  rest(stop);

  return {
    el,
    // The three cells showing, top to bottom.
    get cells() {
      return [...stripEl.children];
    },
    // Rolls the reel downward and settles on `target` after `duration` ms.
    async spinTo(target, duration) {
      const fillers = Math.max(6, Math.round((duration / 1000) * CELLS_PER_SECOND));
      // Top to bottom: one spare cell for the bounce, the target window, the
      // symbols that roll past, then the window showing now.
      const symbols = [at(target - 2), ...windowAt(target)];
      for (let i = 0; i < fillers; i++) symbols.push(at(target + 2 + i));
      symbols.push(...windowAt(stop));
      stripEl.replaceChildren(...symbols.map(cell));

      const start = -(symbols.length - 3) * CELL;
      const end = -CELL;
      el.classList.add('blurred');
      const clear = setTimeout(() => el.classList.remove('blurred'), duration * 0.72);
      const animation = stripEl.animate(
        [
          { transform: `translateY(${start}px)`, easing: 'cubic-bezier(0.3, 0.35, 0.35, 1)' },
          { transform: `translateY(${end + BOUNCE}px)`, offset: 0.9, easing: 'ease-in-out' },
          { transform: `translateY(${end}px)` },
        ],
        { duration, fill: 'forwards' },
      );
      await animation.finished;
      clearTimeout(clear);
      el.classList.remove('blurred');
      animation.cancel();
      rest(target);
    },
  };
}
