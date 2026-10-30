#!/usr/bin/env node
/*
 * Convertit l'export du canvas Design (source/) en site statique pour GitHub Pages (docs/).
 *
 *   node tools/convert.mjs              conversion + pré-rendu des démos (Playwright)
 *   node tools/convert.mjs --no-prerender   conversion seule
 *
 * Entrées :
 *   source/project/canvas.json      index du canvas (titres, ordre des planches)
 *   source/project/<Nom>.dc.html    une planche ; le suffixe EN marque la version anglaise
 *   source/blobs/<id>.webp          images référencées par /_blob/<id>
 *
 * Sortie :
 *   docs/<slug>.html                pages françaises (Main → index.html)
 *   docs/en/<slug>.html             pages anglaises
 *   docs/assets/img/                images renommées
 *   docs/assets/js/                 dc-lite.js (démos) et site.js (petits comportements)
 *   docs/ia.html, llms.txt, llms-full.txt, resume.json (+ en/)  profil pour les IA et les ATS,
 *                                   généré par tools/ia.mjs depuis source/ia/profil.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { loadProfile, headExtras, writeIA } from './ia.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'source');
const OUT = path.join(ROOT, 'docs');
const STATIC = path.join(ROOT, 'tools', 'static');
const PRERENDER = !process.argv.includes('--no-prerender');
const PROFILE = loadProfile(ROOT);

// Nom de planche (sans suffixe EN) → nom de page.
const SLUGS = {
  Main: 'index',
  Amarenco: 'amarenco',
  AmarencoAudit: 'controle-qualite',
  Energiter: 'energiter',
  PlasmaCraft: 'plasmacraft',
  Labo: 'labo',
  LaboKidsVid: 'labo-kidsvid',
  LaboAion: 'labo-aion',
  LaboPico: 'labo-pico',
  LaboPulse: 'labo-pulse',
  Parcours: 'parcours',
};

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

function describe(file) {
  const base = file.replace(/\.dc\.html$/, '');
  const en = /EN$/.test(base);
  const name = en ? base.slice(0, -2) : base;
  const slug = SLUGS[name] || kebab(name);
  return { file, base, name, en, slug, out: (en ? 'en/' : '') + slug + '.html' };
}

function between(text, start, end, file) {
  const i = text.indexOf(start);
  const j = text.indexOf(end, i + start.length);
  if (i < 0 || j < 0) throw new Error(`${file} : ${start} … ${end} introuvable`);
  return text.slice(i + start.length, j);
}

function parseBoard(file) {
  const html = fs.readFileSync(path.join(SRC, 'project', file), 'utf8');
  const lang = (/<html[^>]*\blang="([^"]+)"/.exec(html) || [])[1] || 'fr';
  const title = (/<title>([\s\S]*?)<\/title>/.exec(html) || [])[1] || '';
  const dc = between(html, '<x-dc>', '</x-dc>', file);
  const helmet = between(dc, '<helmet>', '</helmet>', file).trim();
  const body = dc.slice(dc.indexOf('</helmet>') + '</helmet>'.length).trim();
  const script = /<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/.exec(html);
  const logic = script ? script[1].trim() : '';
  const interactive = /\{\{|<sc-for|<sc-if/.test(body);
  return { lang, title, helmet, body, logic, interactive, wrapper: body.includes('<dc-import') };
}

// --- Inventaire -------------------------------------------------------------

const canvas = JSON.parse(fs.readFileSync(path.join(SRC, 'project', 'canvas.json'), 'utf8'));
const files = canvas.order.filter((f) => fs.existsSync(path.join(SRC, 'project', f)));
const boards = [];
for (const file of files) {
  const info = describe(file);
  const parsed = parseBoard(file);
  if (parsed.wrapper) {
    // Les planches « Mobile » ne font qu'afficher l'accueil à 390 px : la page d'accueil
    // est déjà responsive, elles n'ont pas de page propre.
    console.log(`- ${file} ignorée (aperçu d'une autre planche)`);
    continue;
  }
  boards.push(Object.assign(info, parsed, { canvasTitle: (canvas.boards[file] || {}).title || '' }));
}
const byBase = new Map(boards.map((b) => [b.base, b]));

// Images : nom lisible d'après la première planche qui les utilise.
const images = new Map();
const counters = {};
for (const b of boards) {
  for (const m of (b.helmet + b.body + b.logic).matchAll(/\/_blob\/([0-9a-f]{32})/g)) {
    const id = m[1];
    if (images.has(id)) continue;
    const src = fs.readdirSync(path.join(SRC, 'blobs')).find((f) => f.startsWith(id + '.'));
    if (!src) throw new Error(`Image /_blob/${id} absente de source/blobs (planche ${b.file})`);
    counters[b.slug] = (counters[b.slug] || 0) + 1;
    images.set(id, { src, name: `${b.slug}-${counters[b.slug]}${path.extname(src)}` });
  }
}

// --- Réécriture des liens et des images ----------------------------------

function relativeHref(from, to) {
  if (from.en === to.en) return to.slug + '.html';
  return (from.en ? '../' : 'en/') + to.slug + '.html';
}

function rewrite(text, page) {
  const prefix = page.en ? '../' : '';
  text = text.replace(/\/_blob\/([0-9a-f]{32})/g, (_, id) => prefix + 'assets/img/' + images.get(id).name);
  text = text.replace(/href="([A-Za-z0-9_\-/]+)\.dc\.html(#[^"]*)?"/g, (all, base, hash) => {
    const target = byBase.get(base.replace(/^\.?\//, ''));
    if (!target) {
      console.warn(`  ! ${page.file} : lien vers ${base}.dc.html sans page`);
      return all;
    }
    return `href="${relativeHref(page, target)}${hash || ''}"`;
  });
  // Comme le mode play : les liens externes s'ouvrent dans un nouvel onglet.
  text = text.replace(/<a ((?:(?!>)[\s\S])*?)href="(https?:\/\/[^"]+)"/g, (all, before) =>
    /\btarget=/.test(all) ? all : all.replace('<a ', '<a target="_blank" rel="noopener" '));
  return text;
}

// --- Écriture ---------------------------------------------------------------

function alternates(page) {
  const twin = byBase.get(page.en ? page.base.slice(0, -2) : page.base + 'EN');
  if (!twin) return '';
  return `<link rel="alternate" hreflang="${twin.lang}" href="${relativeHref(page, twin)}">\n`;
}

function pageHtml(page) {
  const prefix = page.en ? '../' : '';
  const head =
    `<!doctype html>\n<html lang="${page.lang}">\n<head>\n<meta charset="utf-8">\n` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
    `<title>${page.title}</title>\n` +
    alternates(page) +
    headExtras(PROFILE, page) +
    `<link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml">\n` +
    rewrite(page.helmet, page) + '\n</head>\n<body>\n';
  const body = rewrite(page.body, page);
  if (!page.interactive) {
    return head + body + `\n<script src="${prefix}assets/js/site.js"></script>\n</body>\n</html>\n`;
  }
  const logic = rewrite(page.logic, page);
  // Dans le template, un attribut à trou devient dc-<nom> : le navigateur ne tente pas
  // d'interpréter d="{{…}}" ou onclick="{{…}}" ; dc-lite.js remet le vrai nom au rendu.
  const template = body.replace(/(\s)([A-Za-z_][-A-Za-z0-9_:.]*)="([^"]*\{\{[^"]*)"/g, '$1dc-$2="$3"');
  return head +
    `<div id="dc-root"><!--prerender--></div>\n` +
    `<template id="dc-template">\n${template}\n</template>\n` +
    `<script src="${prefix}assets/js/dc-lite.js"></script>\n` +
    `<script>\n(function () {\n${logic}\nDCLite.mount(Component, document.getElementById('dc-root'), document.getElementById('dc-template'));\n})();\n</script>\n` +
    `</body>\n</html>\n`;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'en'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'assets', 'img'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'assets', 'js'), { recursive: true });

for (const [, img] of images) fs.copyFileSync(path.join(SRC, 'blobs', img.src), path.join(OUT, 'assets', 'img', img.name));
for (const f of fs.readdirSync(STATIC)) {
  const dest = f.endsWith('.js') ? path.join(OUT, 'assets', 'js', f) : path.join(OUT, 'assets', f);
  fs.copyFileSync(path.join(STATIC, f), dest);
}
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

for (const page of boards) {
  fs.writeFileSync(path.join(OUT, page.out), pageHtml(page));
  console.log(`✓ ${page.file.padEnd(24)} → docs/${page.out}${page.interactive ? '  (démo interactive)' : ''}`);
}
console.log(`✓ ${images.size} images → docs/assets/img/`);
writeIA(ROOT, OUT);

// --- Pré-rendu des démos ---------------------------------------------------
// Les pages interactives sont rendues une fois dans Chromium et le résultat est écrit
// dans la page : le contenu est lisible sans JavaScript et s'affiche sans attendre.

if (PRERENDER) {
  let chromium;
  try {
    ({ chromium } = createRequire(import.meta.url)('playwright'));
  } catch {
    console.warn('! Playwright introuvable : pré-rendu ignoré (les démos se rendent au chargement).');
  }
  if (chromium) {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.route(/^https?:/, (route) => route.abort());
    for (const page of boards.filter((b) => b.interactive)) {
      const file = path.join(OUT, page.out);
      const tab = await ctx.newPage();
      const errors = [];
      tab.on('pageerror', (e) => errors.push(e.message));
      await tab.goto(pathToFileURL(file).href);
      await tab.waitForFunction(() => document.getElementById('dc-root').children.length > 0);
      if (errors.length) throw new Error(`${page.file} : ${errors.join(' | ')}`);
      const rendered = await tab.evaluate(() => document.getElementById('dc-root').innerHTML);
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('<!--prerender-->', () => rendered));
      await tab.close();
      console.log(`✓ pré-rendu docs/${page.out}`);
    }
    await browser.close();
  }
}
