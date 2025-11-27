
Instrucciones rápidas para ejecutar el backend local (Node.js + ExcelJS)
---------------------------------------------------------------------

Requisitos:
- Node.js instalado (v14+).
- Terminal / consola.

Pasos:

1) Coloca los archivos `server.js` y `package.json` en la misma carpeta.
2) Abre una terminal en esa carpeta y ejecuta:
   npm install

3) Luego inicia el servidor:
   npm start

4) El servidor escuchará en: http://localhost:3000
   Endpoints:
   - GET  /tasks      -> devuelve todas las tareas (JSON)
   - POST /tasks      -> agrega una tarea (envía objeto task en body)
   - PUT  /tasks/:id  -> actualiza una tarea (envía campos a actualizar en body)

Nota sobre el frontend:
- Por seguridad, si abres `index.html` directamente con file:// el navegador bloqueará las llamadas fetch.
- Sirve el frontend usando:
   - La extensión "Live Server" en VSCode, o
   - npx http-server .  (instala http-server globalmente o usa npx)
   - o cualquier servidor estático (python -m http.server 5500)

Así podrás abrir http://localhost:5500/index.html y el frontend comunicará con http://localhost:3000
