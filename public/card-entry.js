// Keep saved prototype bookmarks, but maintain only one application document.
location.replace(new URL('index.html'+location.search+location.hash,location.href).href);
