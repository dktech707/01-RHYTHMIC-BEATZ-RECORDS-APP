RBR PWA – PATCH (Netlify)

Što je u ovom patchu:
1) app.js:
   - loadAll() sada ima try/catch i prikazuje grešku na ekranu (umjesto "white screen").
   - registerSW() sada forsira update SW-a i automatski reload-a kad nova verzija preuzme kontrolu.
   - Ispravljen tipfeler u event tekstu: "Willy.Ž" -> "Willy."
   - "ElasticStage" label prebačen u "Elastic Stage" + chip label "Vinyl / CD"

2) sw.js:
   - dodan SKIP_WAITING + čišćenje starih cacheva
   - JSON ide network-first (da se ne lijepi stari content)

3) releases.json:
   - dodani orders_label / orders_url i preorder flag (možeš kasnije mapirati u UI)

Kako primijeniti:
A) U tvom root folderu (gdje je index.html):
   - zamijeni postojeće: app.js, sw.js, releases.json, data.json
B) Ponovno deploy:
   - Netlify > Deploys > Drag & drop CIJELI folder (onaj koji sadrži index.html na rootu)

Test nakon deploya:
1) Otvori ove URL-ove u browseru:
   - https://app.rhythmicbeatzrecords.com/
   - https://app.rhythmicbeatzrecords.com/releases.json  (mora otvoriti JSON, ne 404)
2) Hard refresh:
   - PC: Ctrl+F5
   - Android Chrome: Settings > Site settings > Storage > Clear (za app.rhythmicbeatzrecords.com)

Ako i dalje dobiješ 404 na /releases.json:
- To znači da u deploy artifactu NEMA JSON-a (krivi folder uploadan ili je u podfolderu).
- Rješenje: osiguraj da su index.html i *.json u rootu deploya (ne u podfolderu).

Napomena:
- Ako želiš "force refresh" cachea u budućim iteracijama: promijeni CACHE_NAME u sw.js (bump verziju).
