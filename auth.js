/**
 * GymCare – Authentication Handler
 * Handles Member Registration, Member Login, and Admin Authentication
 */

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');
  const adminLoginForm = document.getElementById('admin-login-form');

  // 1. Member Registration
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const fullName = document.getElementById('fullName').value.trim();
      const username = document.getElementById('username').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const address = document.getElementById('address').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      // Basic client validation
      if (!fullName || !username || !email || !phone || !address || !password || !confirmPassword) {
        return showAlert('All fields are required. Please fill out the full form.', 'danger');
      }

      if (password !== confirmPassword) {
        return showAlert('Passwords do not match. Please verify.', 'danger');
      }

      if (password.length < 6) {
        return showAlert('Password must contain at least 6 characters.', 'danger');
      }

      const submitBtn = document.getElementById('register-submit-btn');
      setLoading(submitBtn, true, 'Creating Account...');

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fullName,
            username,
            email,
            phone,
            address,
            password,
            confirmPassword
          })
        });

        const data = await response.json();

        if (data.success) {
          showAlert(data.message, 'success');
          showToast('Account created successfully! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = '/user-dashboard.html';
          }, 1200);
        } else {
          showAlert(data.message || 'Registration failed.', 'danger');
        }
      } catch (err) {
        console.error('Registration fetch error:', err);
        showAlert('Cannot reach server. Make sure backend is running.', 'danger');
      } finally {
        setLoading(submitBtn, false, 'Create My Account');
      }
    });
  }

  // 2. Member Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const identifier = document.getElementById('identifier').value.trim();
      const password = document.getElementById('password').value;

      if (!identifier || !password) {
        return showAlert('Please enter your username/email and password.', 'danger');
      }

      const submitBtn = document.getElementById('login-submit-btn');
      setLoading(submitBtn, true, 'Signing In...');

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ identifier, password })
        });

        const data = await response.json();

        if (data.success) {
          showAlert(data.message, 'success');
          showToast(`Welcome back, ${data.user.fullName}!`, 'success');
          setTimeout(() => {
            if (data.user.role === 'admin') {
              window.location.href = '/admin-dashboard.html';
            } else {
              window.location.href = '/user-dashboard.html';
            }
          }, 800);
        } else {
          showAlert(data.message || 'Login failed.', 'danger');
        }
      } catch (err) {
        console.error('Login error:', err);
        showAlert('Could not connect to server. Check your network or server status.', 'danger');
      } finally {
        setLoading(submitBtn, false, 'Log In');
      }
    });
  }

  // 3. Administrator Login
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const identifier = document.getElementById('admin-identifier').value.trim();
      const password = document.getElementById('admin-password').value;

      if (!identifier || !password) {
        return showAlert('Admin username/email and password are required.', 'danger');
      }

      const submitBtn = document.getElementById('admin-login-submit-btn');
      setLoading(submitBtn, true, 'Authenticating...');

      try {
        const response = await fetch('/api/auth/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ identifier, password })
        });

        const data = await response.json();

        if (data.success) {
          showAlert(data.message, 'success');
          showToast(`Administrator authenticated: ${data.user.fullName}`, 'success');
          setTimeout(() => {
            window.location.href = '/admin-dashboard.html';
          }, 800);
        } else {
          showAlert(data.message || 'Admin authentication failed.', 'danger');
        }
      } catch (err) {
        console.error('Admin login error:', err);
        showAlert('Cannot connect to admin backend.', 'danger');
      } finally {
        setLoading(submitBtn, false, 'Authenticate as Admin');
      }
    });
  }
});

function showAlert(message, type = 'danger') {
  const alertBox = document.getElementById('alert-box');
  if (!alertBox) return;

  alertBox.className = `alert alert-${type}`;
  alertBox.innerText = message;
  alertBox.style.display = 'block';
}

function clearAlert() {
  const alertBox = document.getElementById('alert-box');
  if (alertBox) {
    alertBox.style.display = 'none';
    alertBox.innerText = '';
  }
}

function setLoading(button, isLoading, text) {
  if (!button) return;
  button.disabled = isLoading;
  button.innerText = text;
}
