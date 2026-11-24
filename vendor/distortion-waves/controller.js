import { bezierEase, defaultStyle, duration, hexToRgb, makeParticles, newFront, PALETTES, particleAt, rimLumps, singlePalette, smooth, waveFront } from "./model.js";
import { WaveRenderer } from "./renderer.js";
import { backgroundOf, forgetFonts, snapshot } from "./capture.js";
const PHONE_AREA = 393 * 852;
const COLLAPSE = bezierEase(0.22, 1, 0.36, 1);
const LINEAR = (x)=>x;
const HANDOVER = 0.12;
const LENS_IN = 150;
const FADE = 300;
const MAX_PIXELS = 9_000_000;
const RELEASE_AFTER = 30_000;
const PRESS_WINDOW = 2000;
const INTERACTIVE = "button, a[href], [role=button], input, select, textarea, summary, label, [data-wave-source]";
const clamp = (v, lo, hi)=>Math.min(Math.max(v, lo), hi);
const px = (v)=>parseFloat(v) || 0;
const idle = (fn)=>{
    const w = window;
    if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(fn, {
        timeout: 600
    });
    else window.setTimeout(fn, 1);
};
const HEX_PALETTES = new Map();
function paletteOf(given, fallback) {
    if (!given) return fallback;
    if (typeof given !== "string") return given;
    if (given in PALETTES) return PALETTES[given];
    if (!/^#?[0-9a-f]{6}$/i.test(given)) return fallback;
    const key = given.replace("#", "").toLowerCase();
    let p = HEX_PALETTES.get(key);
    if (!p) {
        p = singlePalette(hexToRgb(key));
        HEX_PALETTES.set(key, p);
    }
    return p;
}
function sameNumbers(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    const ka = Object.keys(a);
    if (ka.length !== Object.keys(b).length) return false;
    const ra = a;
    const rb = b;
    for (const k of ka)if (ra[k] !== rb[k]) return false;
    return true;
}
const ONE_VIEW = [
    "content"
];
const TWO_VIEWS = [
    "content",
    "revealed"
];
const newSlot = ()=>({
        canvas: null,
        ready: false,
        stale: true,
        busy: false,
        dirty: 0,
        cost: 0,
        last: 0,
        began: 0,
        broken: false,
        nodes: 0,
        size: 0,
        walk: 0,
        raster: 0,
        count: 0
    });
function setLayer(el, opacity, active) {
    el.style.opacity = opacity >= 1 ? "" : String(Math.max(opacity, 0));
    el.style.pointerEvents = active ? "" : "none";
    el.toggleAttribute("inert", !active);
    if (active) el.removeAttribute("aria-hidden");
    else el.setAttribute("aria-hidden", "true");
}
export class WaveController {
    root;
    a;
    b;
    opts = {};
    first = true;
    destroyed = false;
    canvas = null;
    renderer = null;
    failed = false;
    positioned = false;
    geom = null;
    geomDirty = true;
    epoch = 0;
    style = defaultStyle("vertical");
    styleDirty = true;
    total = duration(this.style);
    particles = [];
    particlesKey = "";
    dots = {
        data: new Float32Array(0),
        count: 0
    };
    front = newFront();
    probe = newFront();
    spot = {
        x: 0,
        y: 0,
        a: 0
    };
    frame = {
        floor: 0,
        gain: 0,
        round: true,
        same: true
    };
    patch = null;
    primed = false;
    slots = {
        content: newSlot(),
        revealed: newSlot()
    };
    waiting = {
        content: false,
        revealed: false
    };
    p = 0;
    run = null;
    runAt = 0;
    raf = 0;
    scrubbing = false;
    fading = false;
    mode = null;
    lensAt = null;
    lastProp = undefined;
    shown = NaN;
    srcEl = null;
    srcCss = {
        x: 0,
        y: 0,
        w: 1,
        h: 1
    };
    focusCss = null;
    src = {
        x: 0,
        y: 0,
        w: 1,
        h: 1
    };
    focus = null;
    held = false;
    playOpts = null;
    launchAt = 0;
    clearAt = 1;
    press = null;
    pointerInside = false;
    focusInside = false;
    refreshTimer = 0;
    releaseTimer = 0;
    observer;
    resizer;
    abort = new AbortController();
    still = null;
    lastGain = 0;
    lastFloor = 0;
    lastDraw = 0;
    constructor(root, content, revealed = null){
        this.root = root;
        this.a = content;
        this.b = revealed;
        if (getComputedStyle(root).position === "static") {
            root.style.position = "relative";
            this.positioned = true;
        }
        this.still = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
        this.observer = new MutationObserver((records)=>this.onMutations(records));
        this.observer.observe(root, {
            subtree: true,
            childList: true,
            attributes: true,
            characterData: true
        });
        this.resizer = new ResizeObserver(()=>this.onResize());
        this.resizer.observe(root);
        this.listen();
    }
    update(next) {
        if (this.destroyed) return;
        const prev = this.opts;
        this.opts = next;
        const first = this.first;
        this.first = false;
        if (first || prev.type !== next.type || prev.palette !== next.palette || !sameNumbers(prev.waveStyle, next.waveStyle)) this.styleDirty = true;
        if (first || prev.scale !== next.scale || prev.resolution !== next.resolution || prev.cornerRadius !== next.cornerRadius) this.geomDirty = true;
        const prop = next.revealed;
        const changed = prop !== undefined && prop !== this.lastProp;
        if (prop !== undefined) this.lastProp = prop;
        if (next.scrub != null) {
            this.scrubTo(next.scrub);
            return;
        }
        if (this.scrubbing) {
            this.scrubbing = false;
            this.go(prop ?? this.p >= 0.5 ? 1 : 0);
            return;
        }
        if (first) {
            this.p = prop ? 1 : 0;
            this.held = false;
            this.show(this.p);
            if (next.prewarm !== false) this.warm();
            return;
        }
        if (changed) {
            this.go(prop ? 1 : 0);
            return;
        }
        if ((this.styleDirty || this.geomDirty) && !this.run && this.p > 0 && this.p < 1) this.invalidate();
    }
    setRevealedLayer(revealed) {
        if (revealed === this.b) return;
        this.b = revealed;
        this.slots.revealed = newSlot();
        this.renderer?.clearScreen("revealed");
        this.shown = NaN;
        if (!this.run && !this.scrubbing) this.show(this.p >= 1 ? 1 : 0);
    }
    play(options) {
        if (this.destroyed) return;
        this.halt();
        this.scrubbing = false;
        this.p = 0;
        this.held = false;
        this.show(0);
        this.playOpts = options ?? null;
        this.go(1);
    }
    reverse() {
        if (this.destroyed) return;
        this.scrubbing = false;
        this.go(0);
    }
    reset() {
        if (this.destroyed) return;
        this.halt();
        this.scrubbing = false;
        this.p = 0;
        this.held = false;
        this.mode = null;
        this.renderer?.clear();
        if (this.canvas) this.canvas.style.display = "none";
        this.show(0);
        this.rest();
    }
    async prepare() {
        if (this.destroyed || this.opts.capture === false || this.motionless() || !this.ensureRenderer()) return;
        this.flush();
        await Promise.all(this.needed().map((which)=>this.fresh(which) ? undefined : this.capture(which)));
    }
    get debug() {
        const slot = (s)=>({
                ready: s.ready,
                stale: s.stale,
                busy: s.busy,
                cost: s.cost,
                walk: s.walk,
                raster: s.raster,
                nodes: s.nodes,
                size: s.size,
                count: s.count
            });
        return {
            progress: this.p,
            running: !!this.run,
            mode: this.fading ? "fade" : this.mode,
            gain: this.lastGain,
            floor: this.lastFloor,
            draw: this.lastDraw,
            clearAt: this.clearAt,
            duration: this.total,
            geometry: this.geom,
            source: this.src,
            webgl: !!this.renderer && !this.renderer.lost,
            content: slot(this.slots.content),
            revealed: slot(this.slots.revealed)
        };
    }
    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.halt();
        clearTimeout(this.refreshTimer);
        clearTimeout(this.releaseTimer);
        this.abort.abort();
        this.observer.disconnect();
        this.resizer.disconnect();
        this.dropRenderer();
        if (this.positioned) this.root.style.position = "";
    }
    measure() {
        this.geomDirty = false;
        const root = this.root;
        const box = root.getBoundingClientRect();
        const cs = getComputedStyle(root);
        const ow = root.offsetWidth;
        let anc = ow > 0 && box.width > 0 ? box.width / ow : 1;
        if (!(anc > 0) || Math.abs(anc - 1) < 0.01) anc = 1;
        const bl = px(cs.borderLeftWidth);
        const bt = px(cs.borderTopWidth);
        const br = px(cs.borderRightWidth);
        const bb = px(cs.borderBottomWidth);
        const bw = box.width / anc;
        const bh = box.height / anc;
        const w = Math.max(bw - bl - br, 1);
        const h = Math.max(bh - bt - bb, 1);
        const most = Math.min(bw, bh) / 2;
        const corner = (value, border)=>{
            const first = value.split(" ")[0];
            const n = parseFloat(first) || 0;
            return Math.max(Math.min(first.endsWith("%") ? n / 100 * bw : n, most) - border, 0);
        };
        const tl = corner(cs.borderTopLeftRadius, bl);
        const tr = corner(cs.borderTopRightRadius, br);
        const brr = corner(cs.borderBottomRightRadius, br);
        const blr = corner(cs.borderBottomLeftRadius, bl);
        const given = this.opts.cornerRadius;
        const radius = given != null && given >= 0 ? given : Math.max(tl, tr, brr, blr);
        const radii = given != null && given >= 0 && tl + tr + brr + blr === 0 ? `${given}px` : `${tl}px ${tr}px ${brr}px ${blr}px`;
        const scale = this.opts.scale ?? "auto";
        const k = typeof scale === "number" && scale > 0 ? scale : clamp(Math.sqrt(w * h / PHONE_AREA), 0.6, 2.2);
        const most2 = this.renderer?.maxTextureSize || 4096;
        const wanted = this.opts.resolution && this.opts.resolution > 0 ? this.opts.resolution : (window.devicePixelRatio || 1) * anc;
        const bs = Math.min(wanted, Math.sqrt(MAX_PIXELS / (w * h)), most2 / w, most2 / h);
        const W = Math.max(1, Math.round(w * bs));
        const H = Math.max(1, Math.round(h * bs));
        const was = this.geom;
        const moved = !was || was.W !== W || was.H !== H || was.w !== w || was.h !== h || was.bl !== bl || was.bt !== bt;
        const restyled = !was || was.k !== k || was.radius !== radius;
        this.geom = {
            w,
            h,
            bw,
            bh,
            bl,
            bt,
            anc,
            k,
            vw: w / k,
            vh: h / k,
            bs,
            W,
            H,
            radius,
            radii
        };
        const canvas = this.canvas;
        if (canvas) {
            if (canvas.width !== W || canvas.height !== H) {
                canvas.width = W;
                canvas.height = H;
            }
            if (canvas.style.borderRadius !== radii) canvas.style.borderRadius = radii;
        }
        if (moved) {
            this.epoch++;
            this.slots.content.stale = true;
            this.slots.revealed.stale = true;
        }
        if (moved || restyled || this.styleDirty) {
            this.restyle();
            if (this.run || this.scrubbing) {
                if (this.srcEl?.isConnected) {
                    const r = this.srcEl.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0) this.srcCss = this.local(r);
                }
                this.retime();
            }
        }
    }
    local(r) {
        const g = this.geom;
        const box = this.root.getBoundingClientRect();
        return {
            x: (r.left - box.left) / g.anc - g.bl,
            y: (r.top - box.top) / g.anc - g.bt,
            w: r.width / g.anc,
            h: r.height / g.anc
        };
    }
    restyle() {
        const g = this.geom;
        if (!g) return;
        this.styleDirty = false;
        const o = this.opts;
        const s = defaultStyle(o.type ?? "vertical");
        const input = o.waveStyle;
        if (input) {
            const into = s;
            const from = input;
            for(const key in from){
                const v = from[key];
                if (key !== "palette" && key !== "type" && key !== "cornerRadius" && typeof v === "number" && isFinite(v)) into[key] = v;
            }
        }
        s.palette = paletteOf(o.palette ?? input?.palette, s.palette);
        s.cornerRadius = g.radius / g.k;
        const thin = Math.sqrt(g.k);
        s.hairlineWidth /= thin;
        s.particleSize /= thin;
        this.style = s;
        this.total = duration(s);
        const key = `${Math.round(s.particleCount)}|${s.particleSize}|${s.particleLife}`;
        if (key !== this.particlesKey) {
            this.particlesKey = key;
            this.particles = makeParticles(s);
            if (this.dots.data.length < this.particles.length * 3) this.dots = {
                data: new Float32Array(this.particles.length * 3),
                count: 0
            };
        }
    }
    aim(to) {
        const o = this.opts;
        const given = this.playOpts?.source ?? o.source;
        if (to === 0 && this.held && given == null) return;
        const g = this.geom;
        const now = performance.now();
        const press = this.press && now - this.press.t < PRESS_WINDOW ? this.press : null;
        let el = null;
        let rect = null;
        if (given && typeof given.getBoundingClientRect === "function") el = given;
        else if (given && "current" in given) el = given.current;
        else if (given) rect = given;
        if (!el && !rect) {
            if (press?.el?.isConnected) el = press.el;
            else if (!press) {
                const active = document.activeElement;
                if (active && active !== this.root && this.root.contains(active)) el = active;
            }
        }
        if (el) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) rect = this.local(r);
            else el = null;
        }
        const type = o.type ?? "vertical";
        const at = press ? this.local({
            left: press.x,
            top: press.y,
            width: 0,
            height: 0
        }) : null;
        let focus = null;
        const asked = this.playOpts && "focus" in this.playOpts ? this.playOpts.focus : o.focus;
        if (asked !== undefined) focus = asked;
        else if (at && (!el || el === press.el)) focus = {
            x: at.x,
            y: at.y
        };
        if (!rect) {
            const k = g.k;
            if (type === "center") {
                const c = at ?? {
                    x: g.w / 2,
                    y: g.h / 2
                };
                rect = {
                    x: c.x - 29 * k,
                    y: c.y - 29 * k,
                    w: 58 * k,
                    h: 58 * k
                };
            } else if (type === "horizontal") {
                const len = Math.min(g.h * 0.5, 240 * k);
                rect = {
                    x: -20 * k,
                    y: (g.h - len) / 2,
                    w: 40 * k,
                    h: len
                };
            } else {
                const len = Math.min(g.w - 48 * k, 345 * k);
                rect = {
                    x: (g.w - len) / 2,
                    y: g.h - 82 * k,
                    w: len,
                    h: 58 * k
                };
            }
        }
        this.srcEl = el;
        this.srcCss = rect;
        this.focusCss = focus;
    }
    retime() {
        const g = this.geom;
        const s = this.style;
        const k = g.k;
        const c = this.srcCss;
        this.src = {
            x: c.x / k,
            y: c.y / k,
            w: c.w / k,
            h: c.h / k
        };
        this.focus = this.focusCss ? {
            x: this.focusCss.x / k,
            y: this.focusCss.y / k
        } : null;
        this.total = duration(s);
        this.launchAt = s.anticipation / this.total;
        const cleared = (p)=>waveFront(p, this.src, g.vw, g.vh, s, this.focus, this.probe).hasCleared;
        if (!cleared(1)) {
            this.clearAt = 1;
            return;
        }
        let lo = this.launchAt;
        let hi = 1;
        for(let i = 0; i < 22; i++){
            const mid = (lo + hi) / 2;
            if (cleared(mid)) hi = mid;
            else lo = mid;
        }
        this.clearAt = hi;
    }
    motionless() {
        const r = this.opts.reducedMotion ?? "system";
        return r === "always" || r === "system" && !!this.still?.matches;
    }
    needed() {
        return this.b ? TWO_VIEWS : ONE_VIEW;
    }
    fresh(which) {
        const s = this.slots[which];
        return s.ready && !s.stale;
    }
    halt() {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        this.run = null;
        this.fading = false;
        this.playOpts = this.playOpts && null;
    }
    go(to) {
        if (this.destroyed) return;
        clearTimeout(this.refreshTimer);
        clearTimeout(this.releaseTimer);
        this.flush();
        const resting = !this.run && (this.p <= 0 || this.p >= 1);
        if (resting && this.p === to) {
            this.playOpts = null;
            return;
        }
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        if (this.motionless() || !this.ensureRenderer()) {
            this.renderer?.clear();
            if (this.canvas) this.canvas.style.display = "none";
            this.fading = true;
            this.mode = null;
            this.run = {
                from: this.p,
                to,
                t0: -1,
                dur: FADE * Math.abs(to - this.p),
                ease: LINEAR
            };
            this.raf = requestAnimationFrame(this.tick);
            return;
        }
        this.fading = false;
        this.measure();
        if (resting || this.geomDirty) {
            this.aim(to);
            this.mode = null;
        }
        this.retime();
        this.playOpts = null;
        const total = this.total;
        this.run = {
            from: this.p,
            to,
            t0: -1,
            dur: (to === 1 ? total : total / Math.max(this.style.returnSpeed, 0.05)) * 1000,
            ease: to === 1 ? LINEAR : COLLAPSE
        };
        if (resting) {
            const capturing = this.opts.capture !== false;
            this.runAt = performance.now();
            let all = capturing;
            for (const which of this.needed()){
                const ok = this.fresh(which);
                this.waiting[which] = capturing && !ok;
                if (!ok) {
                    all = false;
                    if (capturing && !this.slots[which].busy) void this.capture(which);
                }
            }
            this.lensAt = all ? -Infinity : null;
        }
        this.canvas.style.display = "block";
        this.raf = requestAnimationFrame(this.tick);
    }
    tick = (ts)=>{
        this.raf = 0;
        const run = this.run;
        if (!run) {
            if (this.scrubbing) this.paint(ts);
            return;
        }
        if (run.t0 < 0) run.t0 = ts;
        const x = run.dur > 0 ? (ts - run.t0) / run.dur : 1;
        if (x >= 1) {
            this.finish();
            return;
        }
        this.p = run.from + (run.to - run.from) * run.ease(x);
        this.paint(ts);
        this.raf = requestAnimationFrame(this.tick);
    };
    paint(ts) {
        if (this.fading || !this.renderer || this.renderer.lost) {
            this.show(this.p);
            return;
        }
        const began = performance.now();
        this.draw(ts);
        this.lastDraw = performance.now() - began;
    }
    invalidate() {
        if (!this.raf && !this.destroyed) this.raf = requestAnimationFrame(this.tick);
    }
    finish() {
        const to = this.run.to;
        this.run = null;
        this.p = to;
        this.fading = false;
        this.mode = null;
        this.lensAt = null;
        this.waiting.content = this.waiting.revealed = false;
        this.lastGain = this.lastFloor = 0;
        this.held = to === 1;
        if (this.renderer && !this.renderer.lost) this.renderer.clear();
        if (this.canvas) this.canvas.style.display = "none";
        this.show(to);
        this.rest();
        this.opts.onFinish?.(to === 1);
    }
    scrubTo(value) {
        const p = clamp(value, 0, 1);
        if (!this.scrubbing) {
            const resting = !this.run && (this.p <= 0 || this.p >= 1);
            this.halt();
            this.scrubbing = true;
            clearTimeout(this.refreshTimer);
            clearTimeout(this.releaseTimer);
            this.flush();
            if (this.motionless() || !this.ensureRenderer()) {
                this.fading = true;
            } else {
                this.measure();
                if (resting) {
                    this.aim(1);
                    this.mode = null;
                }
                this.retime();
                this.waiting.content = this.waiting.revealed = false;
                this.lensAt = -Infinity;
                if (this.opts.capture !== false) {
                    for (const which of this.needed())if (!this.fresh(which) && !this.slots[which].busy) void this.capture(which);
                }
                this.canvas.style.display = "block";
            }
        }
        if (p === this.p && this.shown === this.shown && !this.styleDirty && !this.geomDirty) return;
        this.p = p;
        this.invalidate();
    }
    draw(ts) {
        const r = this.renderer;
        if (this.geomDirty) this.measure();
        else if (this.styleDirty) {
            this.restyle();
            this.retime();
        }
        const g = this.geom;
        const s = this.style;
        const p = this.p;
        if (p <= 0 || p >= 1) {
            r.clear();
            this.lastGain = this.lastFloor = 0;
            this.show(p >= 1 ? 1 : 0);
            return;
        }
        const two = !!this.b;
        const front = waveFront(p, this.src, g.vw, g.vh, s, this.focus, this.front);
        const A = this.slots.content;
        const B = this.slots.revealed;
        const capturing = this.opts.capture !== false;
        const open = capturing && A.ready && !this.waiting.content && (!two || B.ready && !this.waiting.revealed);
        let gain = 0;
        if (open) {
            if (this.lensAt === null) this.lensAt = ts;
            gain = this.scrubbing || this.lensAt === -Infinity ? 1 : smooth(0, LENS_IN, ts - this.lensAt);
        }
        let floor = 0;
        let same = true;
        let lens = open;
        const span = HANDOVER / this.total;
        if (two) {
            if (!this.scrubbing && this.mode === null && p > this.launchAt && p < this.clearAt + span) this.mode = open ? "lens" : "plain";
            if (!this.scrubbing && this.mode !== null) lens = this.mode === "lens";
            if (lens) {
                same = false;
                if (p >= this.clearAt) {
                    this.show(1);
                    floor = 1 - smooth(this.clearAt, this.clearAt + span, p);
                } else {
                    this.show(0);
                }
            } else {
                gain = 0;
                this.show(front.hasCleared ? 1 : front.launched ? smooth(0.08, 0.7, front.moved) : 0);
            }
        }
        this.lastGain = gain;
        this.lastFloor = floor;
        r.setSize(g.vw, g.vh);
        r.setBlur(s.blur);
        const lumps = rimLumps(p * this.total, g.vw, g.vh, s.cornerRadius, s.rimPulse);
        const buf = this.dots;
        let n = 0;
        if (front.time > 0) {
            const src = this.src;
            const parts = this.particles;
            const at = this.spot;
            for(let i = 0; i < parts.length; i++){
                const part = parts[i];
                particleAt(part, front, src, s, at);
                if (at.a <= 0.002) continue;
                buf.data[n * 3] = at.x;
                buf.data[n * 3 + 1] = at.y;
                buf.data[n * 3 + 2] = Math.floor(part.size * 10) + Math.min(at.a, 0.999);
                n++;
            }
        }
        buf.count = n;
        const frame = this.frame;
        frame.floor = floor;
        frame.gain = gain;
        frame.same = same;
        if (open) this.patchLive();
        r.render(front, s, lumps, buf, frame);
        if (capturing) this.chase(ts, front, gain > 0 && (front.energy > 0 || front.gravity > 0) || floor > 0 || two && lens && front.launched && p < this.clearAt + span);
    }
    patchLive() {
        const r = this.renderer;
        const g = this.geom;
        if (!r || !g) return;
        const lives = this.root.querySelectorAll("canvas[data-dw-live]");
        if (!lives.length) return;
        let content = false;
        let revealed = false;
        for(let i = 0; i < lives.length; i++){
            const el = lives[i];
            const which = this.a.contains(el) ? "content" : this.b && this.b.contains(el) ? "revealed" : null;
            if (!which || !el.width || !el.height) continue;
            const pic = this.slots[which].canvas;
            if (!pic || !r.has(which)) continue;
            const box = this.local(el.getBoundingClientRect());
            const bs = g.bs;
            const L = box.x * bs;
            const T = box.y * bs;
            const x0 = Math.max(0, Math.floor(L));
            const y0 = Math.max(0, Math.floor(T));
            const x1 = Math.min(pic.width, Math.ceil(L + box.w * bs));
            const y1 = Math.min(pic.height, Math.ceil(T + box.h * bs));
            if (x1 <= x0 || y1 <= y0) continue;
            const w = x1 - x0;
            const h = y1 - y0;
            let patch = this.patch;
            if (!patch) patch = this.patch = document.createElement("canvas");
            if (patch.width !== w || patch.height !== h) {
                patch.width = w;
                patch.height = h;
            }
            const x = patch.getContext("2d");
            if (!x) return;
            x.setTransform(1, 0, 0, 1, 0, 0);
            x.globalCompositeOperation = "copy";
            x.drawImage(pic, x0, y0, w, h, 0, 0, w, h);
            x.globalCompositeOperation = "source-over";
            x.drawImage(el, 0, 0, el.width, el.height, L - x0, T - y0, box.w * bs, box.h * bs);
            r.patchScreen(which, patch, x0, y0);
            if (which === "content") content = true;
            else revealed = true;
        }
        if (content) r.reblur("content");
        if (revealed) r.reblur("revealed");
    }
    chase(ts, front, using) {
        const live = this.opts.live ?? true;
        void front;
        const views = this.needed();
        for(let i = 0; i < views.length; i++){
            const which = views[i];
            const slot = this.slots[which];
            if (slot.busy || slot.broken) continue;
            if (this.waiting[which] || !slot.ready) {
                void this.capture(which);
                continue;
            }
            if (live === false || !using || this.scrubbing) {
                if (this.scrubbing && slot.stale) void this.capture(which);
                continue;
            }
            if (ts - slot.last < Math.max(90, slot.cost * 6)) continue;
            if (!slot.stale && live === "animations" && this.animating(which)) slot.stale = true;
            if (slot.stale) void this.capture(which);
        }
    }
    animating(which) {
        const layer = which === "content" ? this.a : this.b;
        if (!layer || typeof layer.getAnimations !== "function") return false;
        return layer.getAnimations({
            subtree: true
        }).some((a)=>a.playState === "running");
    }
    show(k) {
        if (k === this.shown) return;
        this.shown = k;
        const b = this.b;
        if (!b) {
            setLayer(this.a, 1, true);
        } else {
            const second = k > 0.5;
            setLayer(this.a, k >= 1 ? 0 : 1, !second);
            setLayer(b, k, second);
        }
        this.flush();
    }
    ensureRenderer() {
        if (this.renderer) return this.renderer.lost ? null : this.renderer;
        if (this.failed || this.destroyed) return null;
        const canvas = document.createElement("canvas");
        canvas.setAttribute("data-dw-skip", "");
        canvas.setAttribute("aria-hidden", "true");
        const cs = canvas.style;
        cs.position = "absolute";
        cs.left = cs.top = "0";
        cs.width = cs.height = "100%";
        cs.pointerEvents = "none";
        cs.zIndex = "1";
        cs.display = "none";
        const renderer = new WaveRenderer(canvas, {
            alpha: true
        });
        if (!renderer.ok) {
            this.failed = true;
            return null;
        }
        const o = {
            signal: this.abort.signal
        };
        canvas.addEventListener("webglcontextlost", (e)=>{
            e.preventDefault();
            this.slots.content.ready = this.slots.revealed.ready = false;
            if (this.run) this.finish();
        }, o);
        canvas.addEventListener("webglcontextrestored", ()=>{
            if (this.destroyed || this.canvas !== canvas) return;
            this.renderer = new WaveRenderer(canvas, {
                alpha: true
            });
            this.primed = false;
            this.slots.content.stale = this.slots.revealed.stale = true;
            this.scheduleRefresh(true);
        }, o);
        this.root.appendChild(canvas);
        this.canvas = canvas;
        this.renderer = renderer;
        this.primed = false;
        this.slots.content.ready = this.slots.revealed.ready = false;
        this.geomDirty = true;
        this.flush();
        return renderer;
    }
    dropRenderer() {
        const renderer = this.renderer;
        const canvas = this.canvas;
        this.renderer = null;
        this.canvas = null;
        for (const which of [
            "content",
            "revealed"
        ]){
            const s = this.slots[which];
            s.ready = false;
            s.stale = true;
            s.canvas = null;
        }
        if (renderer?.ok) {
            renderer.dispose();
            canvas?.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext();
        }
        canvas?.remove();
        if (!this.destroyed) this.flush();
    }
    async capture(which) {
        const slot = this.slots[which];
        const layer = which === "content" ? this.a : this.b;
        const renderer = this.renderer;
        if (slot.busy || this.destroyed || !layer || !renderer || renderer.lost) return;
        this.flush();
        if (this.geomDirty || !this.geom) this.measure();
        const g = this.geom;
        const root = this.root;
        const canvas = this.canvas;
        const other = which === "content" ? this.b : this.a;
        const dirty = slot.dirty;
        const epoch = this.epoch;
        const began = performance.now();
        slot.busy = true;
        slot.began = began;
        let landed = false;
        try {
            const skip = (el)=>el === canvas || el === other || el.hasAttribute("data-dw-skip") || el.hasAttribute("data-dw-live");
            const background = backgroundOf(root);
            let source;
            const custom = this.opts.capture;
            if (typeof custom === "function") {
                source = await custom({
                    element: root,
                    slot: which,
                    width: g.w,
                    height: g.h,
                    scale: g.bs,
                    background,
                    ignore: skip
                });
            } else {
                const rootForce = {
                    "border-radius": "0",
                    position: "absolute",
                    left: `${-g.bl}px`,
                    top: `${-g.bt}px`,
                    right: "auto",
                    bottom: "auto",
                    margin: "0",
                    transform: "none",
                    translate: "none",
                    rotate: "none",
                    scale: "none",
                    opacity: "1",
                    visibility: "visible",
                    width: `${g.bw}px`,
                    height: `${g.bh}px`,
                    "box-sizing": "border-box",
                    "min-width": "0",
                    "min-height": "0",
                    "max-width": "none",
                    "max-height": "none"
                };
                const layerForce = {
                    opacity: "1",
                    visibility: "visible"
                };
                const shot = await snapshot(root, {
                    width: g.w,
                    height: g.h,
                    scale: g.bs,
                    background,
                    skip,
                    force: (el)=>el === root ? rootForce : el === layer ? layerForce : undefined,
                    into: slot.canvas ?? undefined
                });
                slot.canvas = shot.canvas;
                slot.walk = shot.walk;
                slot.raster = shot.raster;
                slot.nodes = shot.nodes;
                slot.size = shot.size;
                source = shot.canvas;
            }
            if (this.destroyed || this.renderer !== renderer || renderer.lost) return;
            if (epoch !== this.epoch) return;
            renderer.setScreen(source, g.vw, g.vh, this.style.blur, which);
            slot.ready = true;
            slot.stale = slot.dirty !== dirty;
            slot.broken = false;
            slot.count++;
            landed = true;
        } catch (error) {
            slot.broken = true;
            if (typeof console !== "undefined") console.warn("distortion-waves: could not picture the element; the wave runs without its lens.", error);
        } finally{
            slot.busy = false;
            slot.last = performance.now();
            slot.cost = slot.last - began;
        }
        if (this.destroyed) return;
        if (landed && (began >= this.runAt || !slot.stale)) this.waiting[which] = false;
        if (slot.broken) this.waiting[which] = false;
        if (this.scrubbing) this.invalidate();
        else if (!this.run) {
            if (landed) this.prime();
            this.scheduleRefresh();
        }
    }
    prime() {
        const r = this.renderer;
        const g = this.geom;
        if (this.primed || !r || r.lost || !g) return;
        const views = this.needed();
        for(let i = 0; i < views.length; i++)if (!this.slots[views[i]].ready) return;
        this.primed = true;
        const s = this.style;
        const side = Math.min(g.vw, g.vh) / 4;
        const source = {
            x: (g.vw - side) / 2,
            y: (g.vh - side) / 2,
            w: side,
            h: side
        };
        const front = waveFront((s.anticipation + s.travel * 0.1) / duration(s), source, g.vw, g.vh, s, null, this.probe);
        const dots = this.dots.data.length >= 3 ? this.dots : null;
        if (dots) {
            dots.data[0] = g.vw / 2;
            dots.data[1] = g.vh / 2;
            dots.data[2] = 10.5;
            dots.count = 1;
        }
        r.setSize(g.vw, g.vh);
        r.setBlur(s.blur);
        r.prime(front, s, rimLumps(0, g.vw, g.vh, s.cornerRadius, s.rimPulse), dots, {
            floor: 0,
            gain: 1,
            round: true,
            same: !this.b
        });
        if (dots) dots.count = 0;
    }
    warm() {
        if (this.opts.capture === false) return;
        idle(()=>{
            if (this.destroyed || this.run || this.scrubbing || this.motionless() || !this.ensureRenderer()) return;
            this.refresh();
            this.rest();
        });
    }
    refresh() {
        if (this.destroyed || this.run || this.scrubbing || this.opts.capture === false || !this.renderer || this.renderer.lost) return;
        this.flush();
        for (const which of this.needed()){
            const s = this.slots[which];
            if (!this.fresh(which) && !s.busy && !s.broken) void this.capture(which);
        }
    }
    scheduleRefresh(eager = false) {
        if (this.destroyed || this.run || this.scrubbing || this.opts.capture === false) return;
        if (!this.renderer || this.renderer.lost) return;
        if (!eager && !this.pointerInside && !this.focusInside) return;
        if (this.fresh("content") && (!this.b || this.fresh("revealed"))) return;
        clearTimeout(this.refreshTimer);
        const cost = Math.max(this.slots.content.cost, this.slots.revealed.cost);
        this.refreshTimer = window.setTimeout(()=>idle(()=>this.refresh()), Math.max(140, cost * 8));
    }
    rest() {
        if (this.destroyed) return;
        this.scheduleRefresh();
        clearTimeout(this.releaseTimer);
        if (this.pointerInside || this.focusInside || !this.renderer) return;
        this.releaseTimer = window.setTimeout(()=>{
            if (this.destroyed || this.run || this.scrubbing || this.pointerInside || this.focusInside) return;
            this.dropRenderer();
        }, RELEASE_AFTER);
    }
    mark(node) {
        if (node && node !== this.root) {
            const el = node.nodeType === 1 ? node : node.parentElement;
            const left = el && typeof el.closest === "function" ? el.closest("[data-dw-skip],canvas[data-dw-live]") : null;
            if (left && this.root.contains(left)) return false;
        }
        const A = this.slots.content;
        const B = this.slots.revealed;
        const inA = !!node && this.a.contains(node);
        const inB = !inA && !!node && !!this.b && this.b.contains(node);
        if (!inB) {
            A.dirty++;
            A.stale = true;
            A.broken = false;
        }
        if (!inA) {
            B.dirty++;
            B.stale = true;
            B.broken = false;
        }
        return true;
    }
    onMutations(records) {
        let any = false;
        for (const rec of records){
            const t = rec.target;
            if (t === this.canvas) continue;
            if (rec.type === "attributes") {
                if ((t === this.a || t === this.b) && (rec.attributeName === "style" || rec.attributeName === "inert" || rec.attributeName === "aria-hidden")) continue;
            } else if (rec.type === "childList" && t === this.root) {
                let ours = true;
                for (const list of [
                    rec.addedNodes,
                    rec.removedNodes
                ]){
                    for(let i = 0; i < list.length; i++){
                        const n = list[i];
                        if (!(n.nodeType === 1 && n.hasAttribute("data-dw-skip"))) ours = false;
                    }
                }
                if (ours) continue;
            }
            if (this.mark(t)) any = true;
        }
        if (any) this.scheduleRefresh();
    }
    flush() {
        const records = this.observer.takeRecords();
        if (records.length) this.onMutations(records);
    }
    onResize() {
        const g = this.geom;
        this.geomDirty = true;
        if (!g) return;
        if (this.scrubbing) this.invalidate();
        else if (!this.run) this.scheduleRefresh(true);
    }
    listen() {
        const root = this.root;
        const o = {
            signal: this.abort.signal,
            passive: true
        };
        const oc = {
            ...o,
            capture: true
        };
        const touched = (e)=>{
            if (this.mark(e.target)) this.scheduleRefresh();
        };
        root.addEventListener("pointerdown", (e)=>{
            const t = e.target;
            const el = t && typeof t.closest === "function" ? t.closest(INTERACTIVE) : null;
            this.press = {
                el: el && root.contains(el) ? el : null,
                x: e.clientX,
                y: e.clientY,
                t: performance.now()
            };
        }, oc);
        root.addEventListener("pointerenter", ()=>{
            this.pointerInside = true;
            clearTimeout(this.releaseTimer);
            if (!this.renderer && !this.run && this.opts.capture !== false) this.warm();
            else this.scheduleRefresh();
        }, o);
        root.addEventListener("pointerleave", ()=>{
            this.pointerInside = false;
            if (!this.run && !this.scrubbing) this.rest();
        }, o);
        root.addEventListener("pointerover", touched, o);
        root.addEventListener("pointerout", touched, o);
        root.addEventListener("focusin", (e)=>{
            this.focusInside = true;
            clearTimeout(this.releaseTimer);
            touched(e);
        }, o);
        root.addEventListener("focusout", (e)=>{
            const next = e.relatedTarget;
            this.focusInside = !!next && root.contains(next);
            touched(e);
            if (!this.focusInside && !this.run && !this.scrubbing) this.rest();
        }, o);
        for (const type of [
            "input",
            "change",
            "transitionend",
            "animationend"
        ])root.addEventListener(type, touched, o);
        root.addEventListener("scroll", touched, oc);
        root.addEventListener("load", (e)=>{
            this.mark(e.target);
            this.scheduleRefresh(true);
        }, oc);
        const fonts = document.fonts;
        fonts?.addEventListener?.("loadingdone", ()=>{
            forgetFonts();
            this.mark(null);
            this.scheduleRefresh(true);
        }, o);
    }
}
