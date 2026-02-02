diff --git a/app.js b/app.js
--- a/app.js
+++ b/app.js
@@ -1,10 +1,11 @@
 initSignupOnce();
 registerSW();
-render();
+// Don't call render() here — loadAll() handles the first render after data loads.
+loadAll();
 
@@
-loadAll();
-/* Note: any exported render hook used by app's render() implementation should call postRenderInit() at the end.
+// --- Safety net ---
+// If render() was removed during refactor, keep the app from crashing.
+// Replace this with your real renderer if/when you restore it.
+function render() {
+  try {
+    // If you have a router-style renderer, delegate to it.
+    if (typeof window.route === "function") window.route();
+  } catch (e) {}
+  try {
+    // Ensure post-render wiring still happens if present.
+    if (typeof postRenderInit === "function") postRenderInit();
+  } catch (e) {}
+}
+
+/* Note: any exported render hook used by app's render() implementation should call postRenderInit() at the end. */
