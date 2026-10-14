// Water-drop ripples for any page: click / tap anywhere and silver ripples spread over the page.
// Same water simulation as the home page, drawn on a see-through layer on top of everything.
// Add to a page with:  <script src="ripple.js"></script>  just before </body>
// Options on the script tag:  data-auto="false"  → don't react to clicks by itself (call Ripple.drop(x, y) instead)
//                             data-sound="false" → no drop sound
// Sound: every click / tap anywhere plays the drop sound when it's released. Pages can also call Ripple.sound(volume, speed).
(function () {
    const tag = document.currentScript;
    const AUTO = !(tag && tag.dataset.auto === "false");
    // ---------- SETTINGS (tweak these) ----------
    const SOUND_SRC       = "water-drop-sound.mp3";
    const PLAY_SOUND      = !(tag && tag.dataset.sound === "false");   // drop sound on/off
    const SCALE           = 0.5;     // water resolution (lower = faster)
    const DAMPING         = 6;       // higher = ripples last longer
    const DROP_RADIUS_MIN = 6;       // each click picks a random splash size in this range
    const DROP_RADIUS_MAX = 30;
    const DROP_FORCE      = 1400;    // splash strength
    const LIGHT           = 0.9;     // brightness of the ripple highlights
    const SHADE           = 0.6;     // darkness of the ripple shadows

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;";   // above everything
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let w, h, cur, prev, img, running = false;

    function resize() {
        w = canvas.width  = Math.max(2, Math.floor(innerWidth  * SCALE));
        h = canvas.height = Math.max(2, Math.floor(innerHeight * SCALE));
        cur = new Int32Array(w * h);
        prev = new Int32Array(w * h);
        img = ctx.createImageData(w, h);
    }

    function drop(x, y, screenR) {   // screenR = splash radius in screen pixels (random if not given)
        const r = Math.round((screenR || (DROP_RADIUS_MIN + Math.random() * (DROP_RADIUS_MAX - DROP_RADIUS_MIN)) / 0.75) * SCALE);
        for (let j = -r; j <= r; j++) {
            for (let i = -r; i <= r; i++) {
                const px = x + i, py = y + j;
                if (px < 1 || py < 1 || px >= w - 1 || py >= h - 1) continue;
                const d = Math.sqrt(i * i + j * j);
                if (d <= r) cur[py * w + px] -= DROP_FORCE * (1 - d / r);
            }
        }
    }

    function step() {
        let energy = 0;
        for (let y = 1; y < h - 1; y++) {
            let i = y * w + 1;
            for (let x = 1; x < w - 1; x++, i++) {
                let v = ((cur[i - 1] + cur[i + 1] + cur[i - w] + cur[i + w]) >> 1) - prev[i];
                v -= v >> DAMPING;
                prev[i] = v;
                energy += v < 0 ? -v : v;
            }
        }
        const t = cur; cur = prev; prev = t;
        return energy;
    }

    // Light and shadow only: slopes facing the light glow white, the others darken slightly.
    function render() {
        const d = img.data;
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const i = y * w + x, o = i * 4;
                const slope = (cur[i - 1] - cur[i + 1]) + (cur[i - w] - cur[i + w]);
                if (slope > 0) {
                    d[o] = d[o + 1] = d[o + 2] = 255;
                    d[o + 3] = Math.min(255, slope * LIGHT * 0.45);
                } else {
                    d[o] = d[o + 1] = d[o + 2] = 0;
                    d[o + 3] = Math.min(255, -slope * SHADE * 0.45);
                }
            }
        }
        ctx.putImageData(img, 0, 0);
    }

    function loop() {
        const energy = step();
        render();
        if (energy > w * h * 0.02) requestAnimationFrame(loop);
        else { running = false; cur.fill(0); prev.fill(0); ctx.clearRect(0, 0, w, h); }   // sleep when calm
    }

    // ---------- SOUND ----------
    const baseSound = new Audio(SOUND_SRC);
    baseSound.preload = "auto";                        // load once so clicks play instantly
    function playSound(volume = 0.8, rate = 1) {
        if (!PLAY_SOUND) return;
        const s = baseSound.cloneNode();               // new player each time so quick clicks overlap
        s.volume = volume;
        s.playbackRate = rate;
        s.play().catch(() => {});
    }

    // Every click / tap ends with a drop sound (on release, never on hover).
    window.addEventListener("pointerup", (e) => {
        if (e.button > 0) return;                      // ignore right / middle clicks
        playSound();
    });

    // Links to other pages wait a moment so the sound is heard before the page changes.
    document.addEventListener("click", (e) => {
        const a = e.target.closest && e.target.closest("a[href]");
        if (!a || !PLAY_SOUND || e.defaultPrevented || a.target === "_blank" ||
            e.metaKey || e.ctrlKey || e.shiftKey || a.getAttribute("href").startsWith("#")) return;
        e.preventDefault();
        setTimeout(() => { location.href = a.href; }, 280);
    });

    function dropAt(x, y, screenR) {
        drop(Math.floor(x * SCALE), Math.floor(y * SCALE), screenR);
        if (!running) { running = true; requestAnimationFrame(loop); }
    }
    window.Ripple = { drop: dropAt, sound: playSound };
    if (AUTO) window.addEventListener("pointerdown", (e) => { if (e.button === 0) dropAt(e.clientX, e.clientY); });
    window.addEventListener("resize", resize);
    resize();
})();
