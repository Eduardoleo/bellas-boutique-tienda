import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom';
import HamburgerMenu from '../components/layout/HamburgerMenu';
import SearchBar from '../components/common/SearchBar';
import UserIcon from '../components/layout/UserIcon';
import FloatingCart from '../features/cart/FloatingCart';
import AIChatBot from '../components/common/AIChatBot';
import { SessionManager } from '../components/common/SessionManager';
import Home from '../features/home/Home';
import Login from '../features/auth/Login';
import Register from '../features/auth/Register';
import Profile from '../features/profile/Profile';
import CategoryWomen from '../features/catalog/CategoryWomen';
import CategoryMen from '../features/catalog/CategoryMen';
import CategoryProducts from '../features/catalog/CategoryProducts';
import SearchResults from '../features/catalog/SearchResults';
import ProductDetail from '../features/catalog/ProductDetail';
import TrackingPage from '../features/tracking/TrackingPage';
import ForgotPassword from '../features/auth/ForgotPassword';
import ResetPassword from '../features/auth/ResetPassword';
import FAQPage from '../features/support/FAQPage';
import ChatPage from '../features/support/ChatPage';
import EncuestaPage from '../features/support/EncuestaPage';
import SugerenciasPage from '../features/support/SugerenciasPage';
import AdminUsers from '../features/admin/pages/AdminUsers';
import AdminProducts from '../features/admin/pages/AdminProducts';
import AdminCategories from '../features/admin/pages/AdminCategories';
import AdminOrders from '../features/admin/pages/AdminOrders';
import AdminReports from '../features/admin/pages/AdminReports';
import AdminSupport from '../features/admin/pages/AdminSupport';
import AdminSettings from '../features/admin/pages/AdminSettings';
import './App.css';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  useEffect(()=>{setIsMenuOpen(false)},[location.pathname]);
  const [selectedGender, setSelectedGender] = useState('mujer');

  const handleCategorySelect = (category, genderFromMenu) => {
    const currentPath = location.pathname;
    
    // Priorizar el género del menú, luego detectar desde URL, finalmente usar el estado
    let gender = genderFromMenu || selectedGender;
    
    if (!genderFromMenu) {
      if (currentPath.includes('/catalog-men')) {
        gender = 'hombre';
      } else if (currentPath.includes('/catalog-women')) {
        gender = 'mujer';
      }
    }
    
    // Navegar a la categoría correcta según el género
    if (gender === 'hombre') {
      navigate(`/catalog-men/${category}`);
    } else {
      navigate(`/catalog-women/${category}`);
    }
  };

  return (
    <div className="app">
      <SessionManager>
        <header className="home-header">
          <button
          className="home-hamburger-btn"
          onClick={() => setIsMenuOpen(open => !open)}
          aria-expanded={isMenuOpen} aria-controls="boutique-menu"
          aria-label="Abrir menú"
        >
          <div className="hamburger-line"></div>
          <div className="hamburger-line"></div>
          <div className="hamburger-line"></div>
        </button>

        <Link className="home-logo" to="/">Bellas Boutique</Link>

        <div className="home-header-right">
          <SearchBar />
          <UserIcon />
        </div>
      </header>

      <HamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onCategorySelect={handleCategorySelect}
      />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/catalog-women" element={<CategoryWomen />} />
          <Route path="/catalog-men" element={<CategoryMen />} />
          <Route path="/catalog-women/:category" element={<CategoryProducts />} />
          <Route path="/catalog-men/:category" element={<CategoryProducts />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/tracking/:trackingNumber" element={<TrackingPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/encuesta" element={<EncuestaPage />} />
          <Route path="/sugerencias" element={<SugerenciasPage />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/support" element={<AdminSupport />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Routes>
      </main>

      {/* Carrito flotante */}
      <FloatingCart />

      {/* Chatbot con IA */}
      <AIChatBot />
      </SessionManager>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
