# Portfolio-Rigourd-Brice

Portfolio de Brice Rigourd, publié avec GitHub Pages depuis le dossier `docs/`.
Le site est généré à partir du canvas Design du portfolio (une page HTML par planche, en français et en anglais).

## Structure

```
source/project/   export du canvas : canvas.json et une planche .dc.html par page (suffixe EN = anglais)
source/blobs/     images du canvas, nommées d'après leur identifiant /_blob/<id>
tools/convert.mjs script de conversion canvas → site statique
tools/static/     fichiers copiés tels quels dans le site :
                    dc-lite.js  petit moteur JavaScript des démos (Amarenco, Energiter, PlasmaCraft)
                    site.js     « Copier l'adresse » et agrandissement des couvertures de documents
                    favicon.svg
docs/             site généré (ne pas modifier à la main)
```

Pages produites : `docs/index.html`, `amarenco.html`, `energiter.html`, `plasmacraft.html`, `labo.html`,
`labo-kidsvid.html`, `labo-aion.html`, `labo-pico.html`, `labo-pulse.html`, `parcours.html`,
et les mêmes sous `docs/en/`. Les planches « Mobile » du canvas ne sont pas converties :
elles affichent seulement l'accueil à 390 px, et la page d'accueil est déjà responsive.

## Régénérer le site

Après avoir mis à jour `source/` avec un nouvel export du canvas :

```bash
node tools/convert.mjs
```

Le script réécrit `docs/` en entier : liens entre planches, bouton FR/EN, chemins des images,
liens externes ouverts dans un nouvel onglet. Si Playwright est installé, il pré-rend aussi les
démos pour que leur contenu soit lisible sans JavaScript ; sinon il le signale et elles se
rendent au chargement de la page (`--no-prerender` force ce mode).

Pour prévisualiser :

```bash
python3 -m http.server -d docs 8000
```
