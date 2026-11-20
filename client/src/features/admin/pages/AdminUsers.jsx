import { API_URL } from '../../../app/config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "../../../utils/toast";
import ConfirmModal from "../../../components/common/ConfirmModal";
import './AdminUsers.css';

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    rol: '',
    estado: '',
    search: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, userId: null });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_URL}/users/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/admin/${selectedUser.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: selectedUser.name,
          apellidos: selectedUser.apellidos,
          phone: selectedUser.phone,
          address: selectedUser.address,
          rol: selectedUser.rol,
          estado: selectedUser.estado
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Usuario actualizado exitosamente');
        setShowModal(false);
        fetchUsers();
      } else {
        toast.error(data.message || 'Error al actualizar usuario');
      }
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      toast.error('Error al actualizar usuario');
    }
  };

  const handleDeleteUser = async (userId) => {
    setConfirmDelete({ show: true, userId });
  };

  const confirmDeleteUser = async () => {
    const { userId } = confirmDelete;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/admin/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Usuario eliminado exitosamente');
        fetchUsers();
      } else {
        toast.error(data.message || 'Error al eliminar usuario');
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      toast.error('Error al eliminar usuario');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchRol = !filters.rol || user.rol === filters.rol;
    const matchEstado = !filters.estado || user.estado === filters.estado;
    const matchSearch = !filters.search || 
      user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      (user.cedula && user.cedula.includes(filters.search));
    
    return matchRol && matchEstado && matchSearch;
  });

  if (loading) {
    return <div className="admin-loading">cargando usuarios...</div>;
  }

  return (
    <div className="admin-users-page">
      <div className="admin-users-container">
        <div className="admin-users-header">
          <button onClick={() => navigate('/profile')} className="back-btn">Volver</button>
          <h2>Gestión de usuarios</h2>
        </div>

        <div className="filters-section">
          <input
            type="text"
            placeholder="buscar por nombre, email o cédula..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="search-input"
          />
          
          <select
            value={filters.rol}
            onChange={(e) => setFilters({...filters, rol: e.target.value})}
            className="filter-select"
          >
            <option value="">todos los roles</option>
            <option value="Cliente">cliente</option>
            <option value="Vendedor">vendedor</option>
            <option value="Administrador">administrador</option>
          </select>

          <select
            value={filters.estado}
            onChange={(e) => setFilters({...filters, estado: e.target.value})}
            className="filter-select"
          >
            <option value="">todos los estados</option>
            <option value="Activo">activo</option>
            <option value="Inactivo">inactivo</option>
            <option value="Suspendido">suspendido</option>
          </select>
        </div>

        <div className="users-stats">
          <div className="stat-card">
            <span className="stat-number">{users.length}</span>
            <span className="stat-label">total usuarios</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{users.filter(u => u.rol === 'Cliente').length}</span>
            <span className="stat-label">clientes</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{users.filter(u => u.estado === 'Activo').length}</span>
            <span className="stat-label">activos</span>
          </div>
        </div>

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>id</th>
                <th>cédula</th>
                <th>nombre completo</th>
                <th>email</th>
                <th>teléfono</th>
                <th>rol</th>
                <th>estado</th>
                <th>acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.cedula || 'n/a'}</td>
                  <td>{user.name} {user.apellidos}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || 'n/a'}</td>
                  <td>
                    <span className={`rol-badge ${user.rol.toLowerCase()}`}>
                      {user.rol}
                    </span>
                  </td>
                  <td>
                    <span className={`estado-badge ${user.estado.toLowerCase()}`}>
                      {user.estado}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleEditUser(user)}
                      className="action-btn edit-btn"
                    >
                      editar
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="action-btn delete-btn"
                    >
                      eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>editar usuario</h3>
              <button onClick={() => setShowModal(false)} className="close-modal-btn">×</button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="form-group">
                <label>nombre</label>
                <input
                  type="text"
                  value={selectedUser.name}
                  onChange={(e) => setSelectedUser({...selectedUser, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>apellidos</label>
                <input
                  type="text"
                  value={selectedUser.apellidos || ''}
                  onChange={(e) => setSelectedUser({...selectedUser, apellidos: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>teléfono</label>
                <input
                  type="text"
                  value={selectedUser.phone || ''}
                  onChange={(e) => setSelectedUser({...selectedUser, phone: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>dirección</label>
                <textarea
                  value={selectedUser.address || ''}
                  onChange={(e) => setSelectedUser({...selectedUser, address: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>rol</label>
                <select
                  value={selectedUser.rol}
                  onChange={(e) => setSelectedUser({...selectedUser, rol: e.target.value})}
                  required
                >
                  <option value="Cliente">cliente</option>
                  <option value="Vendedor">vendedor</option>
                  <option value="Administrador">administrador</option>
                </select>
              </div>
              <div className="form-group">
                <label>estado</label>
                <select
                  value={selectedUser.estado}
                  onChange={(e) => setSelectedUser({...selectedUser, estado: e.target.value})}
                  required
                >
                  <option value="Activo">activo</option>
                  <option value="Inactivo">inactivo</option>
                  <option value="Suspendido">suspendido</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="cancel-btn">
                  cancelar
                </button>
                <button type="submit" className="save-btn">
                  guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete.show}
        onClose={() => setConfirmDelete({ show: false, userId: null })}
        onConfirm={confirmDeleteUser}
        title="¿Eliminar usuario?"
        message="Este usuario será eliminado permanentemente del sistema"
        confirmText="Eliminar"
        cancelText="Cancelar"
        danger={true}
      />
    </div>
  );
};

export default AdminUsers;
