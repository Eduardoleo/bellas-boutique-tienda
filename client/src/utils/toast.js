let toastContainer = null;
let toastRoot = null;

const createToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
};

export const showToast = (message, type = 'info') => {
  const container = createToastContainer();
  
  const toastElement = document.createElement('div');
  toastElement.className = `toast toast-${type}`;
  toastElement.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon">
        ${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}
      </span>
      <span class="toast-message">${message}</span>
    </div>
  `;
  
  container.appendChild(toastElement);
  
  setTimeout(() => {
    toastElement.style.animation = 'slideOut 0.3s ease-in forwards';
    setTimeout(() => {
      if (toastElement.parentNode) {
        toastElement.remove();
      }
    }, 300);
  }, 2000);
};

export const toast = {
  success: (message) => showToast(message, 'success'),
  error: (message) => showToast(message, 'error'),
  info: (message) => showToast(message, 'info'),
  warning: (message) => showToast(message, 'warning')
};
