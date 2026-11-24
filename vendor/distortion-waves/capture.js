const XHTML_NS = "http://www.w3.org/1999/xhtml";
const SVG_NS = "http://www.w3.org/2000/svg";
const DROP = new RegExp("^(?:" + [
    "animation",
    "transition",
    "view-timeline",
    "scroll-timeline",
    "timeline-scope",
    "view-transition",
    "scroll-behavior",
    "scroll-snap",
    "scroll-margin",
    "scroll-padding",
    "scroll-marker",
    "scroll-target",
    "overscroll-behavior",
    "anchor-",
    "position-anchor",
    "position-area",
    "position-try",
    "position-visibility",
    "cursor$",
    "pointer-events$",
    "user-select$",
    "-webkit-user-",
    "-moz-user-",
    "touch-action$",
    "will-change$",
    "resize$",
    "caret-",
    "interactivity$",
    "app-region$",
    "-webkit-app-region$",
    "-webkit-tap-highlight",
    "orphans$",
    "widows$",
    "page",
    "break-",
    "speak",
    "interpolate-size$",
    "field-sizing$",
    "reading-flow$",
    "reading-order$",
    "-moz-window",
    "-moz-force-broken",
    "-moz-context-properties$",
    "-moz-orient$",
    "-webkit-line-grid",
    "-webkit-nbsp-mode",
    "-webkit-cursor",
    "-webkit-touch-callout"
].join("|") + ")");
const LOGICAL = /(?:^|-)(?:block|inline)(?:-|$)|^border-(?:start|end)-(?:start|end)-radius$/;
const INHERITED = new Set(("border-collapse border-spacing caption-side color color-scheme direction empty-cells " + "font-family font-feature-settings font-kerning font-language-override font-optical-sizing font-palette " + "font-size font-size-adjust font-stretch font-width font-style font-synthesis-weight font-synthesis-style " + "font-synthesis-small-caps font-synthesis-position font-variant-alternates font-variant-caps " + "font-variant-east-asian font-variant-emoji font-variant-ligatures font-variant-numeric font-variant-position " + "font-variation-settings font-weight forced-color-adjust hanging-punctuation hyphenate-character " + "hyphenate-limit-chars hyphens image-orientation image-rendering letter-spacing line-break line-height " + "line-height-step list-style-image list-style-position list-style-type math-depth math-shift math-style " + "overflow-wrap paint-order print-color-adjust quotes ruby-align ruby-position tab-size text-align " + "text-align-last text-anchor text-autospace text-combine-upright text-decoration-skip-ink text-emphasis-color " + "text-emphasis-position text-emphasis-style text-indent text-justify text-orientation text-rendering " + "text-shadow text-size-adjust text-spacing-trim text-transform text-underline-offset text-underline-position " + "text-wrap-mode text-wrap-style text-wrap white-space-collapse white-space visibility word-break word-spacing " + "writing-mode fill fill-opacity fill-rule stroke stroke-dasharray stroke-dashoffset stroke-linecap " + "stroke-linejoin stroke-miterlimit stroke-opacity stroke-width clip-rule color-interpolation " + "color-interpolation-filters color-rendering shape-rendering marker-start marker-mid marker-end " + "-webkit-font-smoothing -moz-osx-font-smoothing -webkit-text-fill-color -webkit-text-stroke-color " + "-webkit-text-stroke-width -webkit-text-security -webkit-locale -webkit-rtl-ordering -webkit-text-orientation " + "-webkit-writing-mode -webkit-line-break -webkit-border-horizontal-spacing -webkit-border-vertical-spacing " + "-webkit-print-color-adjust -webkit-text-decorations-in-effect -webkit-text-size-adjust " + "-webkit-hyphenate-character -webkit-text-emphasis-color -webkit-text-emphasis-position " + "-webkit-text-emphasis-style -webkit-text-combine -webkit-ruby-position -webkit-text-zoom " + "-webkit-box-direction -webkit-user-modify -moz-text-size-adjust -moz-tab-size -moz-box-direction " + "-webkit-hyphens -webkit-text-underline-position -webkit-font-kerning -webkit-font-feature-settings").split(" "));
const FOLLOWS_COLOR = new Set([
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "outline-color",
    "text-decoration-color",
    "column-rule-color",
    "-webkit-text-decoration-color"
]);
const SKIPPED_TAGS = new Set([
    "script",
    "style",
    "noscript",
    "template",
    "link",
    "meta",
    "title",
    "head",
    "base",
    "source",
    "track",
    "param",
    "datalist"
]);
const VOID_TAGS = new Set([
    "area",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "wbr"
]);
const NAME = /^[A-Za-z_][\w.-]*$/;
const SVG_ATTRIBUTE = /^(?:(?:xlink|xml):)?[A-Za-z_][\w.-]*$/;
const ATTRIBUTES = {
    "*": [
        "dir",
        "lang"
    ],
    input: [
        "type",
        "placeholder",
        "disabled",
        "min",
        "max",
        "step",
        "size",
        "multiple",
        "readonly"
    ],
    textarea: [
        "placeholder",
        "rows",
        "cols",
        "disabled",
        "readonly"
    ],
    select: [
        "multiple",
        "size",
        "disabled"
    ],
    button: [
        "disabled",
        "type"
    ],
    option: [
        "disabled",
        "label"
    ],
    optgroup: [
        "disabled",
        "label"
    ],
    progress: [
        "value",
        "max"
    ],
    meter: [
        "value",
        "min",
        "max",
        "low",
        "high",
        "optimum"
    ],
    td: [
        "colspan",
        "rowspan"
    ],
    th: [
        "colspan",
        "rowspan"
    ],
    col: [
        "span"
    ],
    colgroup: [
        "span"
    ],
    ol: [
        "start",
        "reversed",
        "type"
    ],
    li: [
        "value"
    ],
    details: [
        "open"
    ],
    dialog: [
        "open"
    ]
};
let sandbox = null;
let INH = [];
let NON = [];
let FOLLOWS = [];
let COLOR = 0;
let FAMILY = 0;
let TRANSFORM = -1;
let TRANSFORM_ORIGIN = -1;
let PERSPECTIVE_ORIGIN = -1;
let APPEARANCE = -1;
let STYLES_BOX = [];
let IN_BOX = [];
let DIV = {
    inh: [],
    non: []
};
const bases = new Map();
function setup() {
    if (sandbox && sandbox.frame.isConnected && sandbox.frame.contentDocument === sandbox.doc && sandbox.hidden.isConnected) return true;
    if (typeof document === "undefined") return false;
    sandbox?.frame.remove();
    sandbox = null;
    bases.clear();
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("tabindex", "-1");
    frame.setAttribute("data-dw-skip", "");
    frame.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;border:0;margin:0;padding:0;visibility:hidden;pointer-events:none;";
    (document.body ?? document.documentElement).appendChild(frame);
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) {
        frame.remove();
        return false;
    }
    doc.open();
    doc.write(`<!doctype html><html><head></head><body><div id="h" style="display:none"><svg xmlns="${SVG_NS}"></svg></div></body></html>`);
    doc.close();
    const hidden = doc.getElementById("h");
    if (!hidden) {
        frame.remove();
        return false;
    }
    sandbox = {
        frame,
        win: win,
        doc,
        hidden,
        svg: hidden.firstElementChild
    };
    if (!INH.length) {
        const probe = doc.createElement("div");
        hidden.appendChild(probe);
        const cs = win.getComputedStyle(probe);
        const inh = [];
        const non = [];
        for(let i = 0; i < cs.length; i++){
            const name = cs[i];
            if (name.startsWith("--") || DROP.test(name) || LOGICAL.test(name)) continue;
            (INHERITED.has(name) ? inh : non).push(name);
        }
        probe.remove();
        INH = inh;
        NON = non;
        FOLLOWS = non.map((n)=>FOLLOWS_COLOR.has(n));
        COLOR = inh.indexOf("color");
        FAMILY = inh.indexOf("font-family");
        TRANSFORM = non.indexOf("transform");
        TRANSFORM_ORIGIN = non.indexOf("transform-origin");
        PERSPECTIVE_ORIGIN = non.indexOf("perspective-origin");
        APPEARANCE = non.indexOf("appearance");
        if (APPEARANCE < 0) APPEARANCE = non.indexOf("-webkit-appearance");
        const edge = /^border-(?:top|right|bottom|left)-(?:width|style|color)$/;
        const fill = /^background-(?:color|image)$/;
        const pad = /^padding-(?:top|right|bottom|left)$/;
        IN_BOX = non.map((n)=>edge.test(n) || fill.test(n) || pad.test(n));
        STYLES_BOX = non.map((n, i)=>edge.test(n) || fill.test(n) ? i : -1).filter((i)=>i >= 0);
    }
    DIV = base("div", XHTML_NS, "");
    return true;
}
function base(tag, ns, type) {
    const svg = ns === SVG_NS;
    const key = svg ? "svg:" + tag : type ? tag + ":" + type : tag;
    const hit = bases.get(key);
    if (hit) return hit;
    const sb = sandbox;
    let el;
    try {
        el = svg ? sb.doc.createElementNS(SVG_NS, tag) : sb.doc.createElement(tag);
    } catch  {
        el = sb.doc.createElement("span");
    }
    if (type) el.setAttribute("type", type);
    (svg && tag !== "svg" ? sb.svg : sb.hidden).appendChild(el);
    const cs = sb.win.getComputedStyle(el);
    const made = {
        inh: INH.map((p)=>cs.getPropertyValue(p)),
        non: NON.map((p)=>cs.getPropertyValue(p))
    };
    el.remove();
    bases.set(key, made);
    return made;
}
const store = new Map();
const loading = new Map();
const STORE_LIMIT = 400;
function keep(key, value) {
    if (store.size >= STORE_LIMIT) {
        const first = store.keys().next().value;
        if (first !== undefined) store.delete(first);
    }
    store.set(key, value);
}
function blobToData(blob) {
    return new Promise((resolve)=>{
        const reader = new FileReader();
        reader.onload = ()=>resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = ()=>resolve(null);
        reader.readAsDataURL(blob);
    });
}
async function fetchText(url) {
    try {
        const stop = new AbortController();
        const timer = setTimeout(()=>stop.abort(), 4000);
        const res = await fetch(url, {
            signal: stop.signal
        });
        clearTimeout(timer);
        return res.ok ? await res.text() : null;
    } catch  {
        return null;
    }
}
async function fetchData(url) {
    try {
        const stop = new AbortController();
        const timer = setTimeout(()=>stop.abort(), 4000);
        const res = await fetch(url, {
            signal: stop.signal
        });
        clearTimeout(timer);
        if (!res.ok) return null;
        return await blobToData(await res.blob());
    } catch  {
        return null;
    }
}
async function resample(img, src, w, h) {
    try {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const x = c.getContext("2d");
        if (!x) return fetchData(src);
        x.imageSmoothingQuality = "high";
        x.drawImage(img, 0, 0, w, h);
        const blob = await new Promise((resolve)=>c.toBlob(resolve, "image/webp", 0.96));
        if (blob) return await blobToData(blob);
    } catch  {}
    return fetchData(src);
}
function load(key, loader) {
    let job = loading.get(key);
    if (!job) {
        job = loader().catch(()=>null).then((value)=>{
            keep(key, value);
            loading.delete(key);
        });
        loading.set(key, job);
    }
    return job;
}
let faces = [];
let facesStamp = "";
const sheetText = new Map();
const unquote = (s)=>s.trim().replace(/^(["'])(.*)\1$/, "$2");
const familyKey = (s)=>unquote(s).toLowerCase();
const weightKey = (s)=>s.trim().toLowerCase().replace(/\bnormal\b/g, "400").replace(/\bbold\b/g, "700") || "400";
const rangeKey = (s)=>s.toLowerCase().split(",").map((r)=>r.trim().replace(/^u\+/, "").split("-").map((n)=>n.replace(/^0+(?=.)/, "")).join("-")).filter(Boolean).join(",") || "0-10ffff";
const faceKey = (family, style, weight, range)=>`${familyKey(family)}|${style.trim().toLowerCase() || "normal"}|${weightKey(weight)}|${rangeKey(range)}`;
function declarations(body) {
    const out = {};
    let depth = 0;
    let quote = "";
    let start = 0;
    const push = (end)=>{
        const part = body.slice(start, end);
        const colon = part.indexOf(":");
        if (colon > 0) out[part.slice(0, colon).trim().toLowerCase()] = part.slice(colon + 1).trim();
    };
    for(let i = 0; i < body.length; i++){
        const ch = body[i];
        if (quote) {
            if (ch === "\\") i++;
            else if (ch === quote) quote = "";
        } else if (ch === '"' || ch === "'") quote = ch;
        else if (ch === "(") depth++;
        else if (ch === ")") depth = Math.max(0, depth - 1);
        else if (ch === ";" && depth === 0) {
            push(i);
            start = i + 1;
        }
    }
    push(body.length);
    return out;
}
const KEPT_DESCRIPTORS = [
    "font-style",
    "font-weight",
    "font-stretch",
    "font-width",
    "unicode-range",
    "font-feature-settings",
    "font-variation-settings",
    "ascent-override",
    "descent-override",
    "line-gap-override",
    "size-adjust"
];
function facesIn(text, base, out) {
    const re = /@font-face\s*\{([^}]*)\}/gi;
    let m;
    while(m = re.exec(text)){
        const d = declarations(m[1]);
        const family = d["font-family"];
        const src = d.src;
        if (!family || !src) continue;
        let descriptors = `font-family:"${unquote(family).replace(/["\\]/g, "\\$&")}";`;
        for (const name of KEPT_DESCRIPTORS)if (d[name]) descriptors += `${name}:${d[name]};`;
        out.push({
            family: familyKey(family),
            key: faceKey(family, d["font-style"] ?? "", d["font-weight"] ?? "", d["unicode-range"] ?? ""),
            descriptors,
            src,
            base
        });
    }
}
async function collectFaces() {
    const sheets = Array.from(document.styleSheets);
    const stamp = sheets.length + "|" + sheets.map((s)=>s.href ?? s.ownerNode?.textContent?.length ?? 0).join(",");
    if (stamp === facesStamp) return faces;
    const out = [];
    const pending = [];
    const visit = (sheet, depth)=>{
        const base = sheet.href ?? document.baseURI;
        let rules;
        try {
            rules = sheet.cssRules;
        } catch  {
            if (sheet.href) {
                const href = sheet.href;
                let text = sheetText.get(href);
                if (!text) sheetText.set(href, text = fetchText(href));
                pending.push(text.then((t)=>void (t && facesIn(t, href, out))));
            }
            return;
        }
        const each = (list)=>{
            for(let i = 0; i < list.length; i++){
                const rule = list[i];
                if (rule.constructor.name === "CSSFontFaceRule" || rule.cssText.startsWith("@font-face")) facesIn(rule.cssText, base, out);
                else if (rule.styleSheet && depth < 4) visit(rule.styleSheet, depth + 1);
                else if (rule.cssRules && !rule.cssText.startsWith("@keyframes")) {
                    try {
                        each(rule.cssRules);
                    } catch  {}
                }
            }
        };
        each(rules);
    };
    for (const sheet of sheets)visit(sheet, 0);
    if (document.adoptedStyleSheets) for (const sheet of document.adoptedStyleSheets)visit(sheet, 0);
    await Promise.all(pending);
    faces = out;
    facesStamp = stamp;
    return out;
}
function pickSource(src, base) {
    const re = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)(?:\s*format\(\s*["']?([\w-]+)["']?\s*\))?/g;
    let first = null;
    let m;
    while(m = re.exec(src)){
        const raw = m[1] ?? m[2] ?? m[3] ?? "";
        let url = raw;
        if (!raw.startsWith("data:")) {
            try {
                url = new URL(raw, base).href;
            } catch  {
                continue;
            }
        }
        const format = (m[4] ?? "").toLowerCase();
        if (format === "woff2" || /\.woff2(?:[?#]|$)/i.test(url)) return {
            url,
            format: "woff2"
        };
        first ??= {
            url,
            format
        };
    }
    return first;
}
async function fontCSS(families) {
    if (!families.size || !document.fonts) return "";
    const all = await collectFaces();
    if (!all.length) return "";
    const loaded = new Set();
    document.fonts.forEach((f)=>{
        if (f.status === "loaded") loaded.add(faceKey(f.family, f.style, f.weight, f.unicodeRange));
    });
    const wanted = all.filter((f)=>families.has(f.family) && (loaded.has(f.key) || !/url\(/i.test(f.src)));
    const jobs = [];
    const picked = wanted.map((f)=>{
        if (!/url\(/i.test(f.src)) return {
            f,
            source: null
        };
        const source = pickSource(f.src, f.base);
        if (source && !source.url.startsWith("data:") && store.get("u:" + source.url) === undefined) {
            jobs.push(load("u:" + source.url, ()=>fetchData(source.url)));
        }
        return {
            f,
            source
        };
    });
    if (jobs.length) await Promise.all(jobs);
    let css = "";
    for (const { f, source } of picked){
        if (!source) {
            css += `@font-face{${f.descriptors}src:${f.src};}`;
            continue;
        }
        const data = source.url.startsWith("data:") ? source.url : store.get("u:" + source.url);
        if (!data) continue;
        css += `@font-face{${f.descriptors}src:url("${data}")${source.format ? ` format("${source.format}")` : ""};}`;
    }
    return css;
}
const INVALID = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;
const escapeText = (s)=>/[&<>\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/.test(s) ? s.replace(INVALID, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : s;
const escapeAttribute = (s)=>/[&<"\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/.test(s) ? s.replace(INVALID, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;") : s;
function want(w, key, loader) {
    const hit = store.get(key);
    if (hit !== undefined) return hit;
    if (!w.missing.has(key)) w.missing.set(key, loader);
    return null;
}
const URL_IN_CSS = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/g;
function embedURLs(value, w) {
    return value.replace(URL_IN_CSS, (whole, a, b, c)=>{
        const raw = a ?? b ?? c ?? "";
        if (!raw || raw.startsWith("data:") || raw.startsWith("#")) return whole;
        let abs;
        try {
            abs = new URL(raw, document.baseURI).href;
        } catch  {
            return whole;
        }
        const hash = abs.indexOf("#");
        if (hash >= 0 && abs.slice(0, hash) === location.href.split("#")[0]) return `url("${abs.slice(hash)}")`;
        const data = want(w, "u:" + abs, ()=>fetchData(abs));
        return data ? `url("${data}")` : "none";
    });
}
function noteFamilies(value, w) {
    for (const part of value.split(","))w.families.add(familyKey(part));
}
function imageSource(img, w) {
    const src = img.currentSrc || img.src;
    if (!src) return null;
    if (src.startsWith("data:")) return src;
    if (!img.complete || !img.naturalWidth) return null;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const bw = Math.max(img.clientWidth, 1) * w.o.scale;
    const bh = Math.max(img.clientHeight, 1) * w.o.scale;
    const f = Math.min(1, Math.max(bw / nw, bh / nh));
    if (f > 0.62 || nw * nh < 400_000 || /\.svg(?:[?#]|$)/i.test(src)) return want(w, "u:" + src, ()=>fetchData(src));
    const tw = Math.max(1, Math.ceil(nw * f / 16) * 16);
    const th = Math.max(1, Math.round(tw * nh / nw));
    return want(w, `i:${src}|${tw}`, ()=>resample(img, src, tw, th));
}
function frameOf(el) {
    try {
        if (el instanceof HTMLCanvasElement) return el.width && el.height ? el.toDataURL() : null;
        if (!el.videoWidth || el.readyState < 2) return null;
        const c = document.createElement("canvas");
        c.width = el.videoWidth;
        c.height = el.videoHeight;
        c.getContext("2d").drawImage(el, 0, 0);
        return c.toDataURL("image/jpeg", 0.92);
    } catch  {
        return null;
    }
}
function declare(record) {
    if (!record) return "";
    let css = "";
    for(const key in record)css += `${key}:${record[key]};`;
    return css;
}
function pseudo(el, which, mine, w) {
    const ps = getComputedStyle(el, which);
    const content = ps.getPropertyValue("content");
    if (!content || content === "none" || content === "normal" || content === "-moz-alt-content") return "";
    if (ps.getPropertyValue("display") === "none") return "";
    let css = "";
    let color = "";
    for(let i = 0; i < INH.length; i++){
        const v = ps.getPropertyValue(INH[i]);
        if (i === COLOR) color = v;
        if (v !== mine[i]) css += `${INH[i]}:${v};`;
    }
    const d = DIV.non;
    for(let i = 0; i < NON.length; i++){
        let v = ps.getPropertyValue(NON[i]);
        if (v === d[i]) continue;
        if (FOLLOWS[i] && v === color) continue;
        if (v.indexOf("url(") >= 0) v = embedURLs(v, w);
        css += `${NON[i]}:${v};`;
    }
    const name = "dw" + w.classes++;
    w.rules.push(`.${name}${which}{${css}}`);
    return name;
}
function element(el, parent, parentNS, shift, w) {
    const isRoot = el === w.root;
    if (!isRoot && w.o.skip?.(el)) return;
    const ns = el.namespaceURI;
    const svg = ns === SVG_NS;
    if (!svg && ns !== XHTML_NS) return;
    let tag = el.localName;
    if (!svg && SKIPPED_TAGS.has(tag)) return;
    if (!NAME.test(tag)) return;
    const cs = getComputedStyle(el);
    if (cs.getPropertyValue("display") === "none") return;
    w.nodes++;
    let attributes = "";
    let text = null;
    let childless = false;
    if (!svg) {
        if (tag === "img") {
            const src = imageSource(el, w);
            if (src) attributes += ` src="${escapeAttribute(src)}"`;
        } else if (tag === "canvas" || tag === "video") {
            const src = frameOf(el);
            tag = "img";
            if (src) attributes += ` src="${escapeAttribute(src)}"`;
        } else if (tag === "iframe" || tag === "object" || tag === "embed" || tag === "audio") {
            tag = "div";
            childless = true;
        } else if (tag === "textarea") {
            text = el.value;
        } else if (tag === "input") {
            const input = el;
            if (input.type !== "file") attributes += ` value="${escapeAttribute(input.value)}"`;
            if (input.checked) attributes += ` checked=""`;
        } else if (tag === "option") {
            if (el.selected) attributes += ` selected=""`;
        }
    }
    const type = !svg && (tag === "input" || tag === "button") ? (el.getAttribute("type") ?? "").toLowerCase() : "";
    const tb = base(tag, ns, type);
    const db = svg ? tb : DIV;
    const mine = new Array(INH.length);
    let css = "";
    const tI = tb.inh;
    const dI = db.inh;
    for(let i = 0; i < INH.length; i++){
        const v = cs.getPropertyValue(INH[i]);
        mine[i] = v;
        if (parent === null || tI[i] !== dI[i] || v !== parent[i]) css += `${INH[i]}:${v};`;
    }
    const color = mine[COLOR];
    if (parent === null || mine[FAMILY] !== parent[FAMILY]) noteFamilies(mine[FAMILY], w);
    const tN = tb.non;
    const dN = db.non;
    const flat = !shift && cs.getPropertyValue("transform") === "none" && (cs.getPropertyValue("translate") || "none") === "none" && (cs.getPropertyValue("rotate") || "none") === "none" && (cs.getPropertyValue("scale") || "none") === "none" && (cs.getPropertyValue("offset-path") || "none") === "none";
    let boxed = false;
    if (!svg && APPEARANCE >= 0 && tN[APPEARANCE] !== "none") {
        for(let k = 0; k < STYLES_BOX.length; k++){
            const i = STYLES_BOX[k];
            if (cs.getPropertyValue(NON[i]) !== tN[i]) {
                boxed = true;
                break;
            }
        }
    }
    for(let i = 0; i < NON.length; i++){
        let v = cs.getPropertyValue(NON[i]);
        const d = dN[i];
        const plain = tN[i] === d && !(boxed && IN_BOX[i]);
        if (i === TRANSFORM && shift) {
            v = v === "none" ? shift : `${shift} ${v}`;
        } else if (plain) {
            if (v === d) continue;
            if (FOLLOWS[i] && v === color) continue;
            if (i === TRANSFORM_ORIGIN && flat) continue;
            if (i === PERSPECTIVE_ORIGIN && cs.getPropertyValue("perspective") === "none") continue;
        }
        if (v.indexOf("url(") >= 0) v = embedURLs(v, w);
        css += `${NON[i]}:${v};`;
    }
    css += declare(w.o.force?.(el));
    const before = pseudo(el, "::before", mine, w);
    const after = pseudo(el, "::after", mine, w);
    if (svg) {
        const list = el.attributes;
        for(let i = 0; i < list.length; i++){
            const { name, value } = list[i];
            if (name === "style" || name === "class" || name === "xmlns" || name.startsWith("on") || name.startsWith("xmlns:") || !SVG_ATTRIBUTE.test(name)) continue;
            let v = value;
            if ((name === "href" || name === "xlink:href") && v && !v.startsWith("#") && !v.startsWith("data:")) {
                let abs = v;
                try {
                    abs = new URL(v, document.baseURI).href;
                } catch  {
                    continue;
                }
                const data = want(w, "u:" + abs, ()=>fetchData(abs));
                if (!data) continue;
                v = data;
            }
            attributes += ` ${name}="${escapeAttribute(v)}"`;
        }
    } else {
        for (const name of ATTRIBUTES["*"]){
            const v = el.getAttribute(name);
            if (v !== null) attributes += ` ${name}="${escapeAttribute(v)}"`;
        }
        const own = ATTRIBUTES[tag];
        if (own) {
            for (const name of own){
                const v = el.getAttribute(name);
                if (v !== null) attributes += ` ${name}="${escapeAttribute(v)}"`;
            }
        }
    }
    const classes = before && after ? `${before} ${after}` : before || after;
    const open = `<${tag}${ns !== parentNS ? ` xmlns="${ns}"` : ""}${classes ? ` class="${classes}"` : ""} style="${escapeAttribute(css)}"${attributes}`;
    if (!svg && VOID_TAGS.has(tag)) {
        w.out.push(open + "/>");
        return;
    }
    w.out.push(open + ">");
    if (text !== null) w.out.push(escapeText(text));
    else if (!childless) {
        const sl = el.scrollLeft;
        const st = el.scrollTop;
        const childShift = sl || st ? `translate(${-sl}px,${-st}px)` : "";
        const shadow = el.shadowRoot;
        let kids = shadow ? shadow.childNodes : el.childNodes;
        if (!svg && tag === "slot") {
            const assigned = el.assignedNodes({
                flatten: true
            });
            if (assigned.length) kids = assigned;
        }
        for(let i = 0; i < kids.length; i++){
            const kid = kids[i];
            if (kid.nodeType === 1) element(kid, mine, ns, childShift, w);
            else if (kid.nodeType === 3) w.out.push(escapeText(kid.data));
        }
    }
    w.out.push(`</${tag}>`);
}
function write(root, o) {
    const w = {
        o,
        root,
        out: [],
        rules: [],
        classes: 0,
        nodes: 0,
        missing: new Map(),
        families: new Set()
    };
    element(root, null, XHTML_NS, "", w);
    return w;
}
const PERCENT = {
    "%": "%25",
    "#": "%23",
    "\n": "%0A",
    "\r": "%0D",
    "\t": "%09"
};
function loadImage(svg) {
    return new Promise((resolve, reject)=>{
        const img = new Image();
        img.onload = ()=>resolve(img);
        img.onerror = ()=>reject(new Error("distortion-waves: the snapshot would not load"));
        img.src = "data:image/svg+xml;charset=utf-8," + svg.replace(/[%#\n\r\t]/g, (c)=>PERCENT[c]);
    });
}
function clear(color) {
    return !color || color === "transparent" || /(?:,|\/)\s*0(?:\.0+)?%?\s*\)$/.test(color);
}
export function backgroundOf(el) {
    for(let n = el.parentElement; n; n = n.parentElement){
        const c = getComputedStyle(n).backgroundColor;
        if (!clear(c)) return c;
    }
    return "#fff";
}
const SETTLES = typeof navigator !== "undefined" && /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg\//.test(navigator.userAgent);
const ZOOMS = typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("zoom", "2") && !(typeof navigator !== "undefined" && /Firefox\//.test(navigator.userAgent));
export async function snapshot(root, o) {
    if (!setup()) throw new Error("distortion-waves: no document to read styles in");
    const t0 = performance.now();
    let w = write(root, o);
    let walk = performance.now() - t0;
    if (w.missing.size) {
        await Promise.all(Array.from(w.missing, ([key, loader])=>load(key, loader)));
        const t = performance.now();
        w = write(root, o);
        walk += performance.now() - t;
    }
    const fonts = await fontCSS(w.families);
    const t1 = performance.now();
    const cw = +o.width.toFixed(3);
    const ch = +o.height.toFixed(3);
    const W = Math.max(1, Math.round(o.width * o.scale));
    const H = Math.max(1, Math.round(o.height * o.scale));
    const embedded = fonts.length > 0 || w.out.some((s)=>s.indexOf("data:") >= 0);
    const body = `<style>${escapeText(fonts + w.rules.join(""))}</style>` + w.out.join("");
    const svg = ZOOMS && o.scale !== 1 ? `<svg xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` + `<foreignObject x="0" y="0" width="${W}" height="${H}">` + `<div xmlns="${XHTML_NS}" style="position:relative;width:${W}px;height:${H}px;overflow:hidden;">` + `<div style="position:relative;width:${cw}px;height:${ch}px;overflow:hidden;zoom:${+o.scale.toFixed(4)};">` + body + `</div></div></foreignObject></svg>` : `<svg xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="${cw}" height="${ch}" viewBox="0 0 ${cw} ${ch}">` + `<foreignObject x="0" y="0" width="${cw}" height="${ch}">` + `<div xmlns="${XHTML_NS}" style="position:relative;width:${cw}px;height:${ch}px;overflow:hidden;">` + body + `</div></foreignObject></svg>`;
    const img = await loadImage(svg);
    try {
        await img.decode();
    } catch  {}
    if (SETTLES && embedded) await new Promise((resolve)=>setTimeout(resolve, 60));
    const canvas = o.into ?? document.createElement("canvas");
    if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
    }
    const x = canvas.getContext("2d", {
        alpha: false
    });
    if (!x) throw new Error("distortion-waves: no 2D canvas");
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = "#fff";
    x.fillRect(0, 0, W, H);
    x.fillStyle = o.background;
    x.fillRect(0, 0, W, H);
    x.drawImage(img, 0, 0, W, H);
    return {
        canvas,
        walk,
        raster: performance.now() - t1,
        nodes: w.nodes,
        size: svg.length
    };
}
export function forgetFonts() {
    facesStamp = "";
}
