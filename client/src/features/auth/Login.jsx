import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from "../../services/users";
import { toast } from "../../utils/toast";
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Limpiar error del campo cuando el usuario escribe
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'El email es obligatorio';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    // Validar contraseña (solo que no esté vacía)
    if (!formData.password) {
      newErrors.password = 'La contraseña es obligatoria';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar formulario
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Por favor corrige los errores en el formulario');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await loginUser(formData.email, formData.password);
      
      if (result.success) {
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('token', result.token);
        toast.success(`¡Bienvenido ${result.user.name}!`);
        
        // Redirigir al perfil (mostrará opciones según el rol)
        navigate('/profile');
      } else {
        // Manejar errores específicos
        if (result.message.includes('no existe') || result.message.includes('registrese')) {
          setErrors({ email: 'Este correo no está registrado' });
          toast.error('Usuario no encontrado. ¿Necesitas crear una cuenta?');
        } else if (result.message.includes('incorrectos') || result.message.includes('contraseña')) {
          setErrors({ password: 'Contraseña incorrecta' });
          toast.error('Contraseña incorrecta. Intenta nuevamente.');
        } else if (result.message.includes('inactivo') || result.message.includes('suspendido')) {
          toast.error('Tu cuenta está inactiva. Contacta al administrador.');
        } else {
          toast.error(result.message || 'Error al iniciar sesión');
        }
      }
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      toast.error('Error de conexión. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Iniciar Sesión</h2>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              className={errors.email ? 'input-error' : ''}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className={errors.password ? 'input-error' : ''}
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <div className="forgot-password-link">
            <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="login-footer">
          <p>¿No tienes cuenta? <Link to="/register">Crear cuenta</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
