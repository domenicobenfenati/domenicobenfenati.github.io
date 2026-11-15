# Sito personale – Domenico Benfenati

Sito statico (HTML, CSS, JavaScript, nessun framework) pubblicato con GitHub Pages.
Le pagine `.html` nella cartella principale sono **generate**: non si modificano a mano.
Si modificano i dati o `build.mjs` e poi si rigenera.

## Aggiornare il sito

```bash
node build.mjs        # rigenera index, research, publications, service, teaching, news, contact
git add -A && git commit -m "Aggiorna contenuti" && git push
```

Serve solo Node.js 18 o successivo, senza dipendenze da installare.

## Dove si modificano i contenuti

| Cosa | Dove |
|---|---|
| Pubblicazioni | `data/publications.json` |
| Testi delle pagine (bio, ricerca, news, service, teaching, contatti) | `build.mjs`, nelle costanti `HOME_MAIN`, `RESEARCH_MAIN`, `NEWS_MAIN`, … |
| Menu | `build.mjs`, costante `NAV` |
| Colori e caratteri | `build.mjs`, blocco `:root` in cima alla pagina |
| Foto | `assets/img/portrait.webp` |
| Scena satellitare interattiva della home | `assets/js/sat-hero.js` |

### Aggiungere una pubblicazione

In `data/publications.json` copia una voce esistente e modificala:

```json
{"year": 2027, "type": "journal", "title": "…", "authors": ["Domenico Benfenati", "…"],
 "venue": "Nome della rivista", "abbr": "SIGLA", "doi": "10.xxxx/…", "selected": true}
```

- `type`: `journal`, `conference`, `chapter`, `workshop` o `preprint` (serve per i filtri)
- `abbr`: sigla mostrata accanto al titolo
- `selected: true`: compare tra i "Selected papers" in home (ne vengono mostrati quelli marcati)
- `doi`, `url` (PDF), oppure `links` per altri pulsanti, es. `{"arXiv": "…", "Code": "…"}`
- `etal: true` aggiunge "et al." dopo gli autori elencati

Il tuo nome viene messo in grassetto automaticamente.

## Struttura

```
build.mjs              generatore delle pagine
data/publications.json pubblicazioni
assets/                stili e script (dal kit di taste-skill) + foto + scena satellitare
*.html                 pagine generate, servite da GitHub Pages
```

Lo stile è stato impostato con [taste-skill](https://github.com/leonxlnx/taste-skill):
palette "paper-grey-brass", titoli in Newsreader, testo in Hanken Grotesk, dati in JetBrains Mono.
La scena satellitare della home è generata al momento e non usa dati reali.
