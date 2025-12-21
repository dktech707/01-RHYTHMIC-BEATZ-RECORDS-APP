RBR Patch REV2 (2025-12-20-REV2)

Što rješava:
1) "Ništa se ne mijenja" -> PWA cache / service worker + cache headers (no-store) za app.js i JSON.
2) "Page not found" za /settings.json i slične -> ovo je gotovo uvijek krivi deploy root (ne uploadaju se root fajlovi).
3) "Willy.Ž" -> uklonjeno (sad je samo "Willy").
4) "ElasticStage" -> preimenovano u "Elastic Stage" (display tekst).

KRITIČNO: Deploy root
U Netlify Deploy file browser, u rootu MORAŠ vidjeti:
index.html, app.js, styles.css, manifest.webmanifest, data.json, releases.json, settings.json ... itd.

Ako u rootu vidiš samo foldere tipa "artists / covers / logos" (kao na screenshotu),
onda si uploadao krivi folder-level -> zato dobivaš 404 za /settings.json.

Kako deployati ispravno (manual deploy):
A) Otvori folder E:\RBR_PWA_NETLIFY_UPLOAD
B) Označi SVE unutra (CTRL+A) (fajlovi + folderi), ali NE sam folder.
C) Drag & drop direktno na Netlify "Drag and drop your project folder here" zonu.
   Alternativa: napravi ZIP od sadržaja (ne od parent foldera) i uploadaj ZIP.

Test provjera:
1) Nakon deploya, otvori:
   https://app.rhythmicbeatzrecords.com/app.js
   Trebao bi vidjeti string: RBR PWA BUILD "2025-12-20-REV2" u loadAll() funkciji (CTRL+F "BUILD").
2) Otvori:
   https://app.rhythmicbeatzrecords.com/settings.json
   Ako je 404 -> i dalje deploy root nije dobar (fajl nije gore).

Napomena:
Ako želiš FULL dev-mode bez SW:
- privremeno obriši sw.js iz projekta i izbriši registraciju u app.js.
Ovdje nisam išao u taj ekstrem; umjesto toga sam napravio network-first za JSON i app.js + no-store header.
