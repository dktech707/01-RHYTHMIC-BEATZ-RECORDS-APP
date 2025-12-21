RBR Netlify patch (routes + text fixes)

Što rješava:
1) Netlify 404 na deep-linkovima (npr. /releases, /demo, /settings) -> SPA fallback na index.html
2) Uklanja slučajno slovo "Ž" nakon "Willy"
3) "ElasticStage" prikaz -> "Elastic Stage"
4) Miče onu kratku objašnjavajuću rečenicu u Quick Actions (PWA/label portal tekst)

Kako primijeniti:
1) Otvori svoj lokalni root folder: RBR_PWA_NETLIFY_UPLOAD
2) Kopiraj ova 2 filea u root (overwrite):
   - app.js
   - _redirects   (mora biti točno ovako nazvan, bez ekstenzije)
3) Deploy na Netlify:
   - Drag & drop cijeli root folder (ili barem ova 2 filea unutar istog root-a)

Kako testirati nakon deploya:
- Otvori: https://app.rhythmicbeatzrecords.com/
- Ručno upiši u URL:
  /releases
  /booking
  /demo
  /shop
  -> ne smije bacati Netlify "Page not found"
