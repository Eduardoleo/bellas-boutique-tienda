import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getWomenCatalog, getMenCatalog } from '../../services/catalog';
import { searchCatalog } from '../../utils/catalogSearch';
import './CategoryProducts.css';

export default function SearchResults() {
  const [params] = useSearchParams();
  const query = (params.get('q') || '').trim();
  const [state, setState] = useState({ loading: true, products: [], error: false });
  useEffect(() => {
    let active = true;
    setState({ loading: Boolean(query), products: [], error: false });
    if (query) Promise.all([getWomenCatalog(), getMenCatalog()]).then(results => {
      if (!active) return;
      if (results.some(result => !result.success || !Array.isArray(result.products))) {
        setState({ loading: false, products: [], error: true });
      } else {
        setState({ loading: false, products: searchCatalog(results.map(result => result.products), query), error: false });
      }
    }).catch(() => { if (active) setState({ loading: false, products: [], error: true }); });
    return () => { active = false; };
  }, [query]);
  return <section className="products-page" aria-labelledby="search-title">
    <div className="products-header"><h2 id="search-title">Resultados de búsqueda</h2>
      <p>{query ? 'Nombre: ' + query : 'Escribe un nombre de producto en el buscador.'}</p></div>
    {state.loading && <p role="status">Buscando productos…</p>}
    {state.error && <p role="alert">No se pudo consultar el catálogo. Intenta nuevamente.</p>}
    {!state.loading && !state.error && query && state.products.length === 0 && <p role="status">No hay productos que coincidan con tu búsqueda.</p>}
    {!state.loading && !state.error && <div className="products-grid">
      {state.products.map(product => <Link className="product-card search-product" key={product.id} to={'/product/' + product.id}>
        <div className="product-image">{product.image_url ? <img src={product.image_url} alt={product.name}/> : <span>{product.name}</span>}</div>
        <div className="product-details"><h3>{product.name}</h3><p>{product.category}</p>
          <p className="product-price">₡{Number(product.price).toLocaleString('es-CR')}</p></div>
      </Link>)}
    </div>}
  </section>;
}
