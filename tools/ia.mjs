/*
 * ia.mjs — version du profil pour les assistants IA et les logiciels de recrutement (ATS).
 *
 * Source unique : source/ia/profil.json (français et anglais).
 * Sorties, écrites dans docs/ par convert.mjs :
 *   ia.html, en/ia.html              page HTML sémantique, sans script, avec données schema.org
 *   llms.txt                         index pour les IA (format llmstxt.org)
 *   llms-full.txt, en/llms-full.txt  profil complet en Markdown
 *   resume.json, en/resume.json      profil au format JSON Resume (v1.0.0)
 * Et pour les autres pages : liens <link rel="alternate"> vers ces formats, plus les
 * données schema.org et une description sur l'accueil.
 */
import fs from 'node:fs';
import path from 'node:path';

const L = {
  fr: {
    title: 'Profil pour les IA et les ATS — Brice Rigourd',
    description: "Profil complet et structuré de Brice Rigourd, ingénieur énergie et développeur Python, pour les assistants IA et les logiciels de recrutement (ATS).",
    eyebrow: 'IA · ATS',
    lead: "Cette page rassemble tout le profil sous une forme simple et structurée, pensée pour les logiciels de recrutement (ATS) et les assistants IA. Elle reprend uniquement les informations publiées sur le portfolio. Les mêmes données existent dans des formats lisibles par machine :",
    formats: [
      ['llms-full.txt', 'Profil complet en Markdown', 'le format le plus simple à lire pour un modèle de langage.'],
      ['resume.json', 'JSON Resume', 'format ouvert de CV structuré, importable par les outils de recrutement.'],
      ['../llms.txt', 'llms.txt', "index du portfolio pour les IA, avec les liens vers chaque format."]
    ],
    jsonld: "Données schema.org (JSON-LD) intégrées à cette page et à l'accueil.",
    home: '← Accueil', langGroup: 'Langue', other: 'English version',
    contact: 'Contact et disponibilité', name: 'Nom', label: 'Titre', email: 'E-mail', linkedin: 'LinkedIn',
    location: 'Localisation', mobility: 'Mobilité', availability: 'Disponibilité', contract: 'Contrat', roles: 'Postes recherchés',
    summary: 'Résumé', figures: 'Chiffres clés', work: 'Expérience professionnelle', project: 'Projet',
    tech: 'Technologies', page: 'Page détaillée', personal: 'Projets personnels (Labo)', education: 'Formation',
    skills: 'Compétences', languages: 'Langues', certificates: 'Certifications', documents: 'Documents',
    interests: "Centres d'intérêt", pages: 'Pages du portfolio', updated: 'Mise à jour',
    source: 'Toutes les informations proviennent des pages publiées du portfolio.',
    footer: 'Version texte du portfolio pour les IA et les ATS.',
    otherLangMd: 'English version'
  },
  en: {
    title: 'Profile for AI and ATS — Brice Rigourd',
    description: 'Complete, structured profile of Brice Rigourd, energy engineer and Python developer, for AI assistants and applicant tracking systems (ATS).',
    eyebrow: 'AI · ATS',
    lead: 'This page brings the whole profile together in a simple, structured form, designed for applicant tracking systems (ATS) and AI assistants. It only contains information published on the portfolio. The same data is available in machine-readable formats:',
    formats: [
      ['llms-full.txt', 'Full profile in Markdown', 'the easiest format for a language model to read.'],
      ['resume.json', 'JSON Resume', 'an open, structured résumé format that recruiting tools can import.'],
      ['../llms.txt', 'llms.txt', 'an index of the portfolio for AI, with links to every format.']
    ],
    jsonld: 'schema.org data (JSON-LD) embedded in this page and on the home page.',
    home: '← Home', langGroup: 'Language', other: 'Version française',
    contact: 'Contact and availability', name: 'Name', label: 'Title', email: 'Email', linkedin: 'LinkedIn',
    location: 'Location', mobility: 'Mobility', availability: 'Availability', contract: 'Contract', roles: 'Target roles',
    summary: 'Summary', figures: 'Key figures', work: 'Professional experience', project: 'Project',
    tech: 'Technologies', page: 'Detailed page', personal: 'Personal projects (Lab)', education: 'Education',
    skills: 'Skills', languages: 'Languages', certificates: 'Certifications', documents: 'Documents',
    interests: 'Interests', pages: 'Portfolio pages', updated: 'Last updated',
    source: 'All information comes from the published pages of the portfolio.',
    footer: 'Plain-text version of the portfolio for AI and ATS.',
    otherLangMd: 'Version française'
  }
};

export function loadProfile(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'source', 'ia', 'profil.json'), 'utf8'));
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const siteUrl = (P, lang, file) => P.site + (lang === 'en' ? 'en/' : '') + file;

// --- schema.org --------------------------------------------------------------

function person(P, lang) {
  const D = P[lang];
  const knows = [...new Set(D.skills.flatMap((s) => s.keywords))];
  return {
    '@type': 'Person',
    name: P.name,
    jobTitle: D.label,
    description: D.headline,
    email: 'mailto:' + P.email,
    url: siteUrl(P, lang, ''),
    sameAs: [P.linkedin],
    address: { '@type': 'PostalAddress', addressLocality: P.city, addressRegion: P.region, addressCountry: P.countryCode },
    alumniOf: [...new Set(D.education.map((e) => e.institution))].map((name) => ({ '@type': 'EducationalOrganization', name })),
    hasCredential: D.education.slice(0, 2).map((e) => ({ '@type': 'EducationalOccupationalCredential', credentialCategory: 'degree', name: e.degree, recognizedBy: { '@type': 'EducationalOrganization', name: e.institution } })),
    knowsLanguage: D.languages.map((l) => ({ '@type': 'Language', name: l.language })),
    knowsAbout: knows,
    workLocation: { '@type': 'Place', name: D.location }
  };
}

function jsonLdTag(P, lang, pageUrl) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: pageUrl,
    inLanguage: lang,
    dateModified: P.updated,
    mainEntity: person(P, lang)
  };
  return `<script type="application/ld+json">\n${JSON.stringify(data, null, 2).replace(/</g, '\\u003c')}\n</script>\n`;
}

// Balises ajoutées dans le <head> de chaque page du site.
export function headExtras(P, page) {
  const lang = page.en ? 'en' : 'fr';
  const prefix = page.en ? '../' : '';
  let out =
    `<link rel="alternate" type="text/markdown" href="llms-full.txt" title="${esc(L[lang].formats[0][1])}">\n` +
    `<link rel="alternate" type="application/json" href="resume.json" title="JSON Resume">\n` +
    `<link rel="alternate" type="text/plain" href="${prefix}llms.txt" title="llms.txt">\n`;
  if (page.slug === 'index') {
    out = `<meta name="description" content="${esc(P[lang].headline)}">\n` + out + jsonLdTag(P, lang, siteUrl(P, lang, ''));
  }
  return out;
}

// --- Markdown ----------------------------------------------------------------

function markdown(P, lang) {
  const D = P[lang], T = L[lang];
  const url = (f) => siteUrl(P, lang, f);
  const lines = [];
  const list = (items) => { for (const i of items) lines.push(`- ${i}`); lines.push(''); };
  lines.push(`# ${P.name} — ${D.label}`, '', `> ${D.headline}`, '');
  lines.push(`${T.updated} : ${D.updatedLabel} · ${T.otherLangMd} : ${siteUrl(P, lang === 'en' ? 'fr' : 'en', 'llms-full.txt')} · Portfolio : ${url('')}`, '');
  lines.push(`## ${T.contact}`, '');
  list([
    `${T.email} : ${P.email}`, `${T.linkedin} : ${P.linkedin}`, `${T.location} : ${D.location}`,
    `${T.mobility} : ${D.mobility}`, `${T.availability} : ${D.availability}`, `${T.contract} : ${D.contract}`,
    `${T.roles} : ${D.targetRoles.join(' ; ')}`
  ]);
  lines.push(`## ${T.summary}`, '', D.summary, '');
  lines.push(`## ${T.figures}`, '');
  list(D.keyFigures);
  lines.push(`## ${T.work}`, '');
  for (const w of D.work) {
    lines.push(`### ${w.position} — ${w.company} (${w.location})`, '', `${w.period} · ${w.description}`, '', w.summary, '');
    list(w.highlights);
    for (const p of w.projects) {
      lines.push(`#### ${T.project} : ${p.name} (${p.period})`, '', p.summary, '');
      list(p.highlights);
      lines.push(`${T.tech} : ${p.technologies.join(', ')}`, '', `${T.page} : ${url(p.page)}`, '');
    }
  }
  lines.push(`## ${T.personal}`, '');
  for (const p of D.personalProjects) {
    lines.push(`### ${p.name} (${p.period})`, '', p.summary, '');
    list(p.highlights);
    lines.push(`${T.tech} : ${p.technologies.join(', ')}`, '', `${T.page} : ${url(p.page)}`, '');
  }
  lines.push(`## ${T.education}`, '');
  list(D.education.map((e) => `${e.period} : ${e.degree}, ${e.institution} (${e.location})${e.notes ? '. ' + e.notes : ''}`));
  lines.push(`## ${T.skills}`, '');
  list(D.skills.map((s) => `**${s.name}** : ${s.keywords.join(', ')}`));
  lines.push(`## ${T.languages}`, '');
  list(D.languages.map((l) => `${l.language} : ${l.fluency}`));
  lines.push(`## ${T.certificates}`, '');
  list(D.certificates);
  lines.push(`## ${T.documents}`, '');
  list(D.documents.map((d) => `${d.name} : ${d.detail}`));
  lines.push(`## ${T.interests}`, '', D.interests, '');
  lines.push(`## ${T.pages}`, '');
  list(D.pages.map((p) => `[${p.name}](${url(p.path)})`));
  let text = lines.join('\n').replace(/\n{3,}/g, '\n\n');
  if (lang === 'en') text = text.replace(/ : /g, ': ');
  return text.trimEnd() + '\n';
}

function llmsIndex(P) {
  const fr = P.fr, en = P.en;
  const u = (lang, f) => siteUrl(P, lang, f);
  const pro = fr.work.flatMap((w) => w.projects.map((p) => `- [${p.name}](${u('fr', p.page)}) : ${p.summary}`));
  const perso = fr.personalProjects.map((p) => `- [${p.name}](${u('fr', p.page)}) : ${p.summary}`);
  return [
    `# ${P.name}`,
    '',
    `> ${fr.headline} Basé à ${P.city}, ${fr.availability.toLowerCase()}, mobilité ${fr.mobility}. ${en.label} based in ${P.city}, ${en.availability.toLowerCase()}.`,
    '',
    "Portfolio bilingue (français et anglais). Le profil complet existe en Markdown, en JSON Resume et en page HTML structurée ; toutes les informations proviennent des pages publiées du portfolio. Bilingual portfolio: the full profile is available in Markdown, JSON Resume and structured HTML.",
    '',
    '## Profil complet / Full profile',
    '',
    `- [Profil complet en Markdown (français)](${u('fr', 'llms-full.txt')}) : CV détaillé, expériences, projets, compétences, formation`,
    `- [Full profile in Markdown (English)](${u('en', 'llms-full.txt')}): detailed résumé, experience, projects, skills, education`,
    `- [Page IA et ATS (français)](${u('fr', 'ia.html')}) : même contenu en HTML sémantique, avec données schema.org`,
    `- [AI and ATS page (English)](${u('en', 'ia.html')}): same content as semantic HTML, with schema.org data`,
    `- [JSON Resume (français)](${u('fr', 'resume.json')}) : profil au format JSON Resume v1.0.0`,
    `- [JSON Resume (English)](${u('en', 'resume.json')}): profile in JSON Resume v1.0.0 format`,
    '',
    '## Projets professionnels',
    '',
    ...pro,
    '',
    '## Contact',
    '',
    `- E-mail : ${P.email}`,
    `- LinkedIn : ${P.linkedin}`,
    `- ${fr.location} · ${fr.contract} · ${fr.targetRoles.join(' ; ')}`,
    '',
    '## Optional',
    '',
    ...perso,
    `- [Parcours, documents et contact](${u('fr', 'parcours.html')}) : formation, langues, documents et histoire personnelle`,
    `- [Accueil du portfolio](${u('fr', 'index.html')}) : vue d'ensemble`,
    ''
  ].join('\n');
}

// --- JSON Resume -------------------------------------------------------------

function resume(P, lang) {
  const D = P[lang];
  const projects = [
    ...D.work.flatMap((w) => w.projects.map((p) => ({
      name: p.name, description: p.summary, highlights: p.highlights, keywords: p.technologies,
      startDate: p.startDate, endDate: p.endDate, url: siteUrl(P, lang, p.page), entity: w.company, type: 'professional'
    }))),
    ...D.personalProjects.map((p) => ({
      name: p.name, description: p.summary, highlights: p.highlights, keywords: p.technologies,
      startDate: p.startDate, url: siteUrl(P, lang, p.page), type: 'personal'
    }))
  ];
  return {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name: P.name, label: D.label, email: P.email, url: siteUrl(P, lang, ''), summary: `${D.headline} ${D.summary}`,
      location: { city: P.city, region: P.region, countryCode: P.countryCode },
      profiles: [{ network: 'LinkedIn', username: P.linkedin.replace(/\/$/, '').split('/').pop(), url: P.linkedin }]
    },
    work: D.work.map((w) => ({
      name: w.company, description: w.description, location: w.location, position: w.position,
      startDate: w.startDate, endDate: w.endDate, summary: w.summary,
      highlights: [...w.highlights, ...w.projects.map((p) => `${p.name} (${p.period}) : ${p.summary}`)]
    })),
    education: D.education.map((e) => ({
      institution: e.institution, area: e.degree, studyType: e.degree, startDate: e.startDate, endDate: e.endDate,
      ...(e.notes ? { courses: [e.notes] } : {})
    })),
    certificates: D.certificates.map((name) => ({ name })),
    skills: D.skills.map((s) => ({ name: s.name, keywords: s.keywords })),
    languages: D.languages.map((l) => ({ language: l.language, fluency: l.fluency })),
    interests: [{ name: lang === 'en' ? 'Interests' : "Centres d'intérêt", keywords: [D.interests] }],
    projects,
    meta: {
      canonical: siteUrl(P, lang, 'resume.json'), version: 'v1.0.0', lastModified: P.updated,
      availability: D.availability, contract: D.contract, mobility: D.mobility, targetRoles: D.targetRoles, keyFigures: D.keyFigures
    }
  };
}

// --- Page HTML ---------------------------------------------------------------

const CSS = `
body{margin:0;background:#F2F2EE;color:#111412;font-family:'Archivo','Helvetica Neue',Arial,sans-serif;font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:#111412;text-decoration-color:#FCCA21;text-decoration-thickness:2px;text-underline-offset:4px}a:hover{color:#474D49}
.top{position:sticky;top:0;z-index:30;background:#F2F2EE;border-bottom:1px solid #D5D7D1}
.top>div{max-width:1312px;margin:0 auto;padding:8px clamp(20px,4.5vw,64px);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 20px}
.brand{display:inline-flex;align-items:center;gap:12px;min-height:44px;text-decoration:none}
.logo{position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:#111412;color:#F2F2EE;font-weight:800;font-stretch:125%;font-size:11.5px}
.logo i{position:absolute;right:-4px;bottom:-4px;width:9px;height:9px;background:#FCCA21;border:2px solid #F2F2EE}
.brand b{font-stretch:108%;font-size:16px}.brand small{font-size:14px;font-weight:500;color:#5C625E}
.lang{display:inline-flex;border:2px solid #111412;font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;font-weight:700;letter-spacing:.08em}
.lang span,.lang a{display:inline-flex;align-items:center;min-height:40px;padding:0 12px;text-decoration:none}.lang span{background:#111412;color:#F2F2EE}
main{max-width:880px;margin:0 auto;padding:clamp(48px,6vw,88px) clamp(20px,4.5vw,40px) 72px}
.eyebrow{margin:0;font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#5C625E}
h1{margin:14px 0 0;font-weight:800;font-stretch:112%;font-size:clamp(2rem,4.6vw,3.2rem);line-height:1.05;letter-spacing:-.03em}
h1 span{display:block;margin-top:8px;font-weight:600;font-stretch:100%;font-size:clamp(1.1rem,2.2vw,1.4rem);letter-spacing:-.01em;color:#474D49}
.lead{margin:24px 0 0;font-size:18px;color:#474D49}
.formats{margin:16px 0 0;padding:20px 24px;list-style:none;background:#111412;color:#F2F2EE;box-shadow:10px 10px 0 #FCCA21}
.formats li{padding:6px 0}.formats a{color:#F2F2EE;font-weight:700}.formats li span{color:#A9B0AA}
h2{margin:56px 0 0;padding-top:14px;border-top:2px solid #111412;font-weight:800;font-stretch:108%;font-size:clamp(1.4rem,2.6vw,1.8rem);line-height:1.15;letter-spacing:-.015em}
h3{margin:32px 0 0;font-size:20px;line-height:1.3}h4{margin:22px 0 0;font-size:17px}
.meta{margin:4px 0 0;font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:13.5px;color:#5C625E}
p{margin:10px 0 0}ul{margin:10px 0 0;padding-left:22px}li{margin:4px 0}
dl{margin:16px 0 0;display:grid;grid-template-columns:minmax(120px,190px) minmax(0,1fr);gap:8px 20px}dt{font-weight:700}dd{margin:0;color:#474D49}
@media (max-width:560px){dl{grid-template-columns:1fr;gap:2px}dd{margin-bottom:10px}}
.project{margin-top:18px;padding:4px 0 4px 18px;border-left:3px solid #FCCA21}
.small{margin-top:56px;font-size:14px;color:#5C625E}
footer{background:#111412;color:#A9B0AA;font-size:13.5px}footer>div{max-width:1312px;margin:0 auto;padding:24px clamp(20px,4.5vw,64px);display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 32px}
footer b{color:#F2F2EE}
`;

function page(P, lang) {
  const D = P[lang], T = L[lang];
  const prefix = lang === 'en' ? '../' : '';
  const twin = lang === 'en' ? '../ia.html' : 'en/ia.html';
  const a = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;
  const ul = (items) => `<ul>\n${items.map((i) => `<li>${esc(i)}</li>`).join('\n')}\n</ul>`;
  const proj = (p, isWork) => `<section class="project" aria-label="${esc(p.name)}">\n` +
    `<h4>${isWork ? esc(T.project) + ' : ' : ''}${esc(p.name)}</h4>\n<p class="meta">${esc(p.period)}</p>\n<p>${esc(p.summary)}</p>\n${ul(p.highlights)}\n` +
    `<p><strong>${esc(T.tech)}</strong> : ${esc(p.technologies.join(', '))}</p>\n<p>${esc(T.page)} : ${a(p.page, siteUrl(P, lang, p.page))}</p>\n</section>`;
  const work = D.work.map((w) =>
    `<article>\n<h3>${esc(w.position)} — ${esc(w.company)}</h3>\n<p class="meta">${esc(w.period)} · ${esc(w.location)} · ${esc(w.description)}</p>\n` +
    `<p>${esc(w.summary)}</p>\n${ul(w.highlights)}\n${w.projects.map((p) => proj(p, true)).join('\n')}\n</article>`).join('\n');
  const personal = D.personalProjects.map((p) => proj(p, false)).join('\n');
  const edu = D.education.map((e) =>
    `<li><strong>${esc(e.degree)}</strong>, ${esc(e.institution)} (${esc(e.location)}), ${esc(e.period)}${e.notes ? '. ' + esc(e.notes) : ''}</li>`).join('\n');
  let html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(T.title)}</title>
<meta name="description" content="${esc(T.description)}">
<link rel="alternate" hreflang="${lang === 'en' ? 'fr' : 'en'}" href="${twin}">
<link rel="alternate" type="text/markdown" href="llms-full.txt" title="${esc(T.formats[0][1])}">
<link rel="alternate" type="application/json" href="resume.json" title="JSON Resume">
<link rel="alternate" type="text/plain" href="${prefix}llms.txt" title="llms.txt">
<link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&amp;family=JetBrains+Mono:wght@500;600;700&amp;display=swap">
<style>${CSS}</style>
${jsonLdTag(P, lang, siteUrl(P, lang, 'ia.html'))}</head>
<body>
<header class="top"><div>
<a class="brand" href="index.html"><span class="logo" aria-hidden="true">BR<i></i></span><b>${esc(P.name)}</b><small>${esc(T.home)}</small></a>
<div class="lang" role="group" aria-label="${esc(T.langGroup)}">${lang === 'fr'
    ? `<span aria-current="true">FR</span><a href="${twin}" hreflang="en" lang="en" aria-label="${esc(T.other)}">EN</a>`
    : `<a href="${twin}" hreflang="fr" lang="fr" aria-label="${esc(T.other)}">FR</a><span aria-current="true">EN</span>`}</div>
</div></header>
<main id="profil">
<p class="eyebrow">${esc(T.eyebrow)}</p>
<h1>${esc(P.name)}<span>${esc(D.label)}</span></h1>
<p class="lead">${esc(T.lead)}</p>
<ul class="formats">
${T.formats.map(([href, name, desc]) => `<li>${a(href.startsWith('../') ? prefix + href.slice(3) : href, name)} <span>(${esc(href.replace('../', ''))}) : ${esc(desc)}</span></li>`).join('\n')}
<li><span>${esc(T.jsonld)}</span></li>
</ul>

<h2>${esc(T.contact)}</h2>
<dl>
<dt>${esc(T.name)}</dt><dd>${esc(P.name)}</dd>
<dt>${esc(T.label)}</dt><dd>${esc(D.label)}</dd>
<dt>${esc(T.email)}</dt><dd>${a('mailto:' + P.email, P.email)}</dd>
<dt>${esc(T.linkedin)}</dt><dd>${a(P.linkedin, P.linkedin.replace('https://www.', ''))}</dd>
<dt>${esc(T.location)}</dt><dd>${esc(D.location)}</dd>
<dt>${esc(T.mobility)}</dt><dd>${esc(D.mobility)}</dd>
<dt>${esc(T.availability)}</dt><dd>${esc(D.availability)}</dd>
<dt>${esc(T.contract)}</dt><dd>${esc(D.contract)}</dd>
<dt>${esc(T.roles)}</dt><dd>${ul(D.targetRoles)}</dd>
</dl>

<h2>${esc(T.summary)}</h2>
<p>${esc(D.headline)}</p>
<p>${esc(D.summary)}</p>

<h2>${esc(T.figures)}</h2>
${ul(D.keyFigures)}

<h2>${esc(T.work)}</h2>
${work}

<h2>${esc(T.personal)}</h2>
${personal}

<h2>${esc(T.education)}</h2>
<ul>
${edu}
</ul>

<h2>${esc(T.skills)}</h2>
<dl>
${D.skills.map((s) => `<dt>${esc(s.name)}</dt><dd>${esc(s.keywords.join(', '))}</dd>`).join('\n')}
</dl>

<h2>${esc(T.languages)}</h2>
${ul(D.languages.map((l) => `${l.language} : ${l.fluency}`))}

<h2>${esc(T.certificates)}</h2>
${ul(D.certificates)}

<h2>${esc(T.documents)}</h2>
${ul(D.documents.map((d) => `${d.name} : ${d.detail}`))}

<h2>${esc(T.interests)}</h2>
<p>${esc(D.interests)}</p>

<h2>${esc(T.pages)}</h2>
<ul>
${D.pages.map((p) => `<li>${a(p.path, p.name)}</li>`).join('\n')}
</ul>

<p class="small">${esc(T.updated)} : ${esc(D.updatedLabel)}. ${esc(T.source)}</p>
</main>
<footer><div><b>© 2026 ${esc(P.name)}</b><span>${esc(T.footer)}</span></div></footer>
</body>
</html>
`;
  if (lang === 'en') html = html.replace(/ : /g, ': ');
  return html;
}

export function writeIA(root, out) {
  const P = loadProfile(root);
  for (const lang of ['fr', 'en']) {
    const dir = lang === 'en' ? path.join(out, 'en') : out;
    fs.writeFileSync(path.join(dir, 'ia.html'), page(P, lang));
    fs.writeFileSync(path.join(dir, 'llms-full.txt'), markdown(P, lang));
    fs.writeFileSync(path.join(dir, 'resume.json'), JSON.stringify(resume(P, lang), null, 2) + '\n');
  }
  fs.writeFileSync(path.join(out, 'llms.txt'), llmsIndex(P));
  console.log('✓ profil IA/ATS → docs/ia.html, docs/llms.txt, docs/llms-full.txt, docs/resume.json (+ en/)');
}
