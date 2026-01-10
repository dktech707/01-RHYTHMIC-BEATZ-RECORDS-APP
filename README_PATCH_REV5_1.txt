RBR Patch REV5.1 (2025-12-30)

Hotfixes
1) index.html
   Uklonjen višak </button> u bottom nav, to je bio HTML error koji može razbiti DOM i klikove.

2) styles.css
   Popravljeni CSS parse problemi
   ..card__title ispravljeno u .card__title
   Uklonjen stray "}" prije .img--qr
   Dodani stilovi koji su se referencirali u UI-u a nisu postojali
   btn--ghost
   badge--accent
   newsItem
   link

3) app.js
   Popravljen Book flow: klik iz Artists taba sada preusmjerava na Booking i prefill-a Artist bez rušenja.
   Dodan isPastDate helper: UPCOMING sekcije ignoriraju evente koji su po datumu u prošlosti.
   BUILD marker ažuriran na 2025-12-30-REV5.1.

4) sw.js
   Dodan playlists.json u CORE_ASSETS za offline caching.
