import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from "../../services/users";
import { toast } from "../../utils/toast";
import './Register.css';
import {validIdentification,validPhone,identificationMessage,phoneMessage} from '../../utils/contactValidation';

const Register = () => {
  const [formData, setFormData] = useState({
    cedula: '',
    name: '',
    apellidos: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: ''
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
    if(!validIdentification(formData.cedula))newErrors.cedula=identificationMessage;
    if(!validPhone(formData.phone))newErrors.phone=phoneMessage;

    // Validar nombre
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    // Validar apellidos
    if (!formData.apellidos || formData.apellidos.trim().length < 2) {
      newErrors.apellidos = 'Los apellidos deben tener al menos 2 caracteres';
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'El email es obligatorio';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    // Validar contraseña
    if (!formData.password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    } else {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        newErrors.password = 'La contraseña debe incluir mayúsculas, minúsculas, números y caracteres especiales (@$!%*?&)';
      }
    }

    // Validar confirmación de contraseña
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Debes confirmar tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
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
      const result = await registerUser({
        cedula: formData.cedula,
        name: formData.name,
        apellidos: formData.apellidos,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        address: formData.address
      });

      if (result.success) {
        toast.success('¡Cuenta creada exitosamente! Redirigiendo al login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        // Manejar errores específicos del servidor
        if (result.message.includes('email')) {
          setErrors({ email: result.message });
          toast.error(result.message);
        } else if (result.message.includes('contraseña')) {
          setErrors({ password: result.message });
          toast.error(result.message);
        } else {
          toast.error(result.message || 'Error al crear la cuenta');
        }
      }
    } catch (err) {
      console.error('Error al registrar:', err);
      toast.error('Error de conexión. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h2>Crear Cuenta</h2>
          <p>Únete a Bellas Boutique</p>
        </div>
        
        <p id="cedula-help">{identificationMessage}</p><p id="phone-help">{phoneMessage}</p>
        {errors.cedula && <p role="alert">{errors.cedula}</p>}{errors.phone && <p role="alert">{errors.phone}</p>}
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Nombre *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Tu nombre"
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="apellidos">Apellidos *</label>
              <input
                type="text"
                id="apellidos"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleChange}
                placeholder="Tus apellidos"
                className={errors.apellidos ? 'error' : ''}
              />
              {errors.apellidos && <span className="error-text">{errors.apellidos}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cedula">Cédula</label>
              <input
                type="text"
                id="cedula"
                name="cedula"
                maxLength={20} aria-describedby="cedula-help"
                value={formData.cedula}
                onChange={handleChange}
                placeholder="0-0000-0000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Teléfono</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                maxLength={24} aria-describedby="phone-help"
                value={formData.phone}
                onChange={handleChange}
                placeholder="1234-5678"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Dirección</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Tu dirección completa (opcional)"
              rows="2"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Contraseña *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={errors.password ? 'error' : ''}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar Contraseña *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={errors.confirmPassword ? 'error' : ''}
              />
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>
          </div>

          <div className="password-requirements">
            <p>La contraseña debe contener:</p>
            <ul>
              <li className={formData.password.length >= 8 ? 'valid' : ''}>
                Mínimo 8 caracteres
              </li>
              <li className={/[A-Z]/.test(formData.password) ? 'valid' : ''}>
                Al menos una mayúscula
              </li>
              <li className={/[a-z]/.test(formData.password) ? 'valid' : ''}>
                Al menos una minúscula
              </li>
              <li className={/\d/.test(formData.password) ? 'valid' : ''}>
                Al menos un número
              </li>
              <li className={/[@$!%*?&]/.test(formData.password) ? 'valid' : ''}>
                Al menos un carácter especial (@$!%*?&)
              </li>
            </ul>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="register-footer">
          <p>¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
