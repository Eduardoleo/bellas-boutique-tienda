import React from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchBar.css';

const SearchBar = () => {
  const navigate = useNavigate();
  function handleSearch(event) {
    event.preventDefault();
    const query = event.currentTarget.elements.search.value.trim();
    navigate('/search?' + new URLSearchParams({ q: query }));
  }
  return <form className="search-bar" role="search" onSubmit={handleSearch}>
    <input type="search" name="search" aria-label="Buscar productos por nombre"
      placeholder="Buscar" className="search-input" maxLength={100}/>
  </form>;
};
export default SearchBar;
