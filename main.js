/**
 * GymCare – Shared Utility and UI Script
 */

// Toast notification helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Format date into human-readable format
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Format currency
function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

// Mobile navigation toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // Check auth status for public navigation
  checkNavAuth();
});

// Update public navigation bar based on active session
async function checkNavAuth() {
  const authNav = document.getElementById('auth-nav-container');
  if (!authNav) return;

  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const data = await res.json();

    if (data.success && data.user) {
      if (data.user.role === 'admin') {
        authNav.innerHTML = `
          <a href="/admin-dashboard.html" class="btn btn-primary btn-sm">Admin Dashboard</a>
          <button onclick="handleLogout()" class="btn btn-outline btn-sm">Logout</button>
        `;
      } else {
        authNav.innerHTML = `
          <a href="/user-dashboard.html" class="btn btn-primary btn-sm">My Dashboard</a>
          <button onclick="handleLogout()" class="btn btn-outline btn-sm">Logout</button>
        `;
      }
    } else {
      authNav.innerHTML = `
        <a href="/login.html" class="btn btn-outline btn-sm">Login</a>
        <a href="/register.html" class="btn btn-primary btn-sm">Join Now</a>
      `;
    }
  } catch (err) {
    // Fallback default
    authNav.innerHTML = `
      <a href="/login.html" class="btn btn-outline btn-sm">Login</a>
      <a href="/register.html" class="btn btn-primary btn-sm">Join Now</a>
    `;
  }
}

// Global logout handler
async function handleLogout() {
  try {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    const data = await res.json();
    if (data.success) {
      showToast('Logged out successfully', 'success');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 700);
    }
  } catch (err) {
    console.error('Logout error:', err);
    window.location.href = '/login.html';
  }
}
