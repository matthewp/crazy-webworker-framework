/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app and you should
 * disable HTTP caching for this file too.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */

importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.2.0/workbox-sw.js");

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
self.__precacheManifest = [
  {
    "url": "app.js",
    "revision": "c6f20be104dcab798e3b9521c0b30e46"
  },
  {
    "url": "favicon.ico",
    "revision": "7522e123750db337a8fbb15ecb24bb77"
  },
  {
    "url": "frankenstein-fritz-flame.png",
    "revision": "d382c041fa5e0564cf780e5ec57dfb7f"
  },
  {
    "url": "frankenstein-fritz-flame.webp",
    "revision": "64a0d9e360f13b66a5b9c7fe82802cd1"
  },
  {
    "url": "index.html",
    "revision": "6380510fd058033c17a4f00ea618a22b"
  },
  {
    "url": "main.js",
    "revision": "3536702f1133c921974775339d47ea53"
  },
  {
    "url": "manifest.json",
    "revision": "4c5a863777c53de7143a363767de0ad8"
  },
  {
    "url": "images/logo-144.png",
    "revision": "df8c7d604b90c1e2e4fd5dfa4fc1239d"
  },
  {
    "url": "images/logo-192.png",
    "revision": "db6fcdf854262a09bf49066cfd28db6f"
  },
  {
    "url": "images/logo-512.png",
    "revision": "15fda8d80d083e8c46c0226f7bffafcf"
  },
  {
    "url": "images/logo-96.png",
    "revision": "14e97738e405176ea97e08fa5d4bbd91"
  }
].concat(self.__precacheManifest || []);
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});
