README PATCH REV6.1 (2025-12-30)

Includes:
- Bottom navigation constrained on desktop + extra bottom padding (prevents content overlap).
- Grid card layout fixed on desktop (no forced 3-column squeeze).
- Store: sample packs + bundle now use FULL RELEASE BUNDLE artwork (no empty cards), with safe image fallback.
- Releases: RBR007 Society Collapse status set to Out now + formats include Vinyl/CD.
- Booking policy:
  - All booking emails go to rhythmicbeatzrecords@gmail.com (via data.json infoEmail).
  - Non DKTech roster artists are event bookings only (Inquiry type locked).
  - DKTech has optional inquiry type (Event booking / Other inquiry).

How to apply (Windows PowerShell):
1) From your repo root: Expand-Archive -Path ".\RBR_PATCH_REV6_1.zip" -DestinationPath "." -Force
2) git add app.js styles.css sw.js releases.json store.json assets/store/full_release_bundle.*
3) git commit -m "REV6.1 booking policy + store art + layout fixes"
4) git push

If you use GitHub Pages from main: merge rev6-beta -> main, or change Pages source to rev6-beta.
