// Only product arrays returned by the public catalogue endpoints are searched.
export function searchCatalog(catalogues, term) {
  const query = typeof term === 'string' ? term.trim().toLocaleLowerCase('es') : '';
  if (!query) return [];
  const seen = new Set();
  return catalogues.flat().filter(product => {
    if (!product || typeof product.name !== 'string' || seen.has(product.id)) return false;
    if (!product.name.toLocaleLowerCase('es').includes(query)) return false;
    seen.add(product.id);
    return true;
  });
}
