# Distortion Waves 0.1.0

MIT, copyright Jakub Antalik. License is shipped in dist/vendor/distortion-waves/LICENSE.

Upstream: https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/distortion-waves
Reference: https://libraries.dev/waves
Retrieved 2026-11-24; upstream package tree 45e3a8ab1c46d66a5075b9a623c1e858685391f5.

These four TypeScript files are unmodified upstream source, without the React wrapper.
Rebuild browser modules with Node 24+: `node scripts/build-waves.cjs`.
The site's viewport/click adapter is dist/contact-wave.js. It captures only before
the wave, caps its drawing resolution and disposes GPU resources after use.
