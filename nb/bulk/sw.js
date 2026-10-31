
"use strict";

const files = new Map();
let ready = false;

self.addEventListener("install", (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

function normalizePath(path) {
    let result = path.replace(/\\/g, "/");
    
    // Normaliser les chemins issus d'une archive ZIP.
    result = result.replace(/^\/+/, "");
    result = result.replace(/^(\.\/)+/, "");
    
    // Refuser les chemins qui tentent de sortir de la racine.
    if (result.split("/").some((part) => part === "..")) {
        throw new Error("Chemin ZIP interdit : " + path);
    }
    
    return result;
}

self.addEventListener("message", (event) => {
    const port = event.ports && event.ports[0];
    
    try {
        const data = event.data;
        
        if (!data || data.type !== "LOAD_FILES" || !data.files) {
            if (port) port.postMessage({ ok: false, error: "Message invalide" });
            return;
        }
        
        const nextFiles = new Map();
        
        for (const [path, buffer] of Object.entries(data.files)) {
            const name = normalizePath(path);
            
            if (!name) continue;
            
            nextFiles.set(name, new Uint8Array(buffer));
        }
        
        if (!nextFiles.size) {
            throw new Error("L'archive ne contient aucun fichier");
        }
        
        files.clear();
        for (const [name, bytes] of nextFiles) {
            files.set(name, bytes);
        }
        
        ready = true;
        
        console.info("[sw] fichiers chargés :", files.size);
        console.info("[sw] exemples :", [...files.keys()].slice(0, 15));
        
        if (port) {
            port.postMessage({
                ok: true,
                count: files.size,
                hasIndex: [...files.keys()].some(
                                                 (name) => name === "index.html" || name.endsWith("/index.html")
                                                 )
            });
        }
    } catch (error) {
        ready = false;
        console.error("[sw] erreur de chargement :", error);
        
        if (port) {
            port.postMessage({
                ok: false,
                error: String(error)
            });
        }
    }
});

const MIME = {
    html: "text/html; charset=utf-8",
    htm: "text/html; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    mjs: "text/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "application/json",
    wasm: "application/wasm",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    webp: "image/webp",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    otf: "font/otf",
    txt: "text/plain; charset=utf-8",
    csv: "text/csv; charset=utf-8",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    pdf: "application/pdf"
};

function findFile(name) {
    // Recherche exacte.
    if (files.has(name)) return files.get(name);
    
    // Tolérer un répertoire racine ajouté lors de l'export.
    for (const [path, bytes] of files) {
        if (path.endsWith("/" + name)) return bytes;
    }
    
    // Pour la page d'entrée, accepter un index dans un sous-répertoire.
    if (name === "index.html") {
        for (const [path, bytes] of files) {
            if (path.endsWith("/index.html")) return bytes;
        }
    }
    
    return null;
}

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;
    
    const scopePath = new URL(self.registration.scope).pathname;
    
    if (!url.pathname.startsWith(scopePath)) return;
    
    let relative = url.pathname.slice(scopePath.length);
    
    // Ne traiter que les requêtes de l'application virtuelle.
    if (!relative.startsWith("app/")) return;
    
    relative = relative.slice("app/".length);
    
    try {
        relative = normalizePath(relative);
    } catch {
        event.respondWith(
                          new Response("Chemin interdit", { status: 400 })
                          );
        return;
    }
    
    if (!relative || relative.endsWith("/")) {
        relative += "index.html";
    }
    
    if (!ready) {
        event.respondWith(
                          new Response("Application non déverrouillée ou fichiers non chargés", {
                              status: 503,
                              headers: { "Content-Type": "text/plain; charset=utf-8" }
                          })
                          );
        return;
    }
    
    const bytes = findFile(relative);
    
    if (!bytes) {
        console.warn("[sw] fichier absent :", relative);
        
        event.respondWith(
                          new Response("Fichier absent : " + relative, {
                              status: 404,
                              headers: { "Content-Type": "text/plain; charset=utf-8" }
                          })
                          );
        return;
    }
    
    const ext = relative.includes(".")
    ? relative.split(".").pop().toLowerCase()
    : "";
    
    event.respondWith(
                      new Response(bytes, {
                          headers: {
                              "Content-Type": MIME[ext] || "application/octet-stream",
                              "X-Content-Type-Options": "nosniff"
                          }
                      })
                      );
});


///* Service worker : sert les fichiers déchiffrés (en mémoire) sous le chemin virtuel app/ */
//"use strict";
//
//const files = new Map();
//
//// Prendre le contrôle immédiatement, même à la première visite
//self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
//self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
//
//self.addEventListener("message", (event) => {
//  const data = event.data;
//  if (data && data.files) {
//    files.clear();
//    for (const [name, buf] of Object.entries(data.files)) {
//      files.set(name, new Uint8Array(buf));
//    }
//    const keys = [...files.keys()];
//    console.info("[sw] fichiers servis :", keys.slice(0, 5).join(", "),
//                 keys.length > 5 ? "…" : "");
//  }
//});
//
//const MIME = {
//  html: "text/html", htm: "text/html",
//  js: "text/javascript", mjs: "text/javascript",
//  css: "text/css", json: "application/json",
//  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
//  gif: "image/gif", svg: "image/svg+xml", ico: "image/x-icon",
//  webp: "image/webp", woff: "font/woff", woff2: "font/woff2",
//  ttf: "font/ttf", otf: "font/otf", wasm: "application/wasm",
//  txt: "text/plain", md: "text/plain", csv: "text/csv",
//  mp3: "audio/mpeg", mp4: "video/mp4", pdf: "application/pdf",
//};
//
//self.addEventListener("fetch", (event) => {
//  const url = new URL(event.request.url);
//  if (url.origin !== self.location.origin) return;
//
//  const scopePath = new URL(self.registration.scope).pathname;
//  if (!url.pathname.startsWith(scopePath)) return;
//
//  let name = url.pathname.slice(scopePath.length);
//  if (!name.startsWith("app/")) return;
//  name = name.slice(4) || "index.html";
//  if (name.endsWith("/")) name += "index.html";
//  try { name = decodeURIComponent(name); } catch (_) {}
//
//  let data = files.get(name);
//  if (!data) {
//    // Tolérance : l'app peut être imbriquée dans un sous-dossier du zip
//    // (ex. build/index.html au lieu de index.html)
//    for (const [k, v] of files) {
//      if (k === name || k.endsWith("/" + name)) { data = v; break; }
//    }
//  }
//  if (!data) {
//    event.respondWith(new Response("Not found", { status: 404 }));
//    return;
//  }
//  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
//  event.respondWith(new Response(data, {
//    headers: { "Content-Type": MIME[ext] || "application/octet-stream" },
//  }));
//});
