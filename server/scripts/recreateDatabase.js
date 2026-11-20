// Retained as a safe compatibility guard. Never opens or deletes a database.
console.error('recreate-db está deshabilitado: no se permite borrar ni reemplazar bases. Configure un destino nuevo y use init-db. Las migraciones requieren revisión separada.');
process.exitCode = 1;
