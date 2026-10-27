/**
 * GymCare – Member Dashboard Controller
 */

let currentUser = null;
let currentActiveMembership = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Check Authentication
  const authenticated = await initUserProfile();
  if (!authenticated) return;

  // 2. Setup Navigation Tab Listeners
  setupTabNavigation();

  // 3. Load initial dashboard data
  await Promise.all([
    loadMembershipData(),
    loadAvailablePlans(),
    loadPaymentHistory(),
    loadAttendanceHistory(),
    loadFeedbackHistory()
  ]);

  // 4. Setup form event listeners
  setupEventListeners();
});

// Authenticate and load profile
async function initUserProfile() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const data = await res.json();

    if (!data.success || !data.user) {
      window.location.href = '/login.html';
      return false;
    }

    currentUser = data.user;

    // Populate user details across the dashboard
    document.getElementById('sidebar-name').innerText = currentUser.fullName;
    document.getElementById('nav-user-greeting').innerText = `Hi, ${currentUser.fullName.split(' ')[0]}`;
    document.getElementById('welcome-title').innerText = `Welcome back, ${currentUser.fullName}!`;

    // Populate profile settings tab
    document.getElementById('profile-username').value = currentUser.username;
    document.getElementById('profile-email').value = currentUser.email;
    document.getElementById('profile-fullName').value = currentUser.fullName;
    document.getElementById('profile-phone').value = currentUser.phone;
    document.getElementById('profile-address').value = currentUser.address;

    return true;
  } catch (err) {
    console.error('Session verification error:', err);
    window.location.href = '/login.html';
    return false;
  }
}

// Tab Switching
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.sidebar-nav .tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  // Hide all sections
  document.querySelectorAll('.dashboard-tab').forEach(sec => {
    sec.style.display = 'none';
  });

  // Remove active from all sidebar buttons
  document.querySelectorAll('.sidebar-nav .tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    }
  });

  // Show target section
  const targetSection = document.getElementById(tabId);
  if (targetSection) {
    targetSection.style.display = 'block';
  }
}

// 1. Membership Information
async function loadMembershipData() {
  try {
    const res = await fetch('/api/memberships/my', { credentials: 'include' });
    const data = await res.json();

    const statusEl = document.getElementById('stat-membership-status');
    const daysEl = document.getElementById('stat-days-remaining');
    const detailsContainer = document.getElementById('active-membership-details');

    if (data.success && data.activeMembership) {
      currentActiveMembership = data.activeMembership;
      const mem = data.activeMembership;
      const plan = mem.plan || {};

      statusEl.innerHTML = `<span class="badge badge-success">Active</span>`;
      daysEl.innerText = `${data.daysRemaining} Days`;

      detailsContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 20px;">
          <div>
            <span class="badge badge-success" style="margin-bottom: 8px;">Active Plan</span>
            <h3 style="font-size: 1.5rem; color: var(--color-navy); margin: 4px 0;">${plan.name || 'Custom Plan'}</h3>
            <p style="color: var(--color-muted-text); font-size: 0.95rem;">${plan.description || ''}</p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-top: 18px;">
              <div>
                <small style="color: var(--color-muted-text); font-weight: 600; text-transform: uppercase;">Start Date</small>
                <p style="font-weight: 700; color: var(--color-dark-text); font-size: 1.05rem;">${formatDate(mem.startDate)}</p>
              </div>
              <div>
                <small style="color: var(--color-muted-text); font-weight: 600; text-transform: uppercase;">Expiry Date</small>
                <p style="font-weight: 700; color: #166534; font-size: 1.05rem;">${formatDate(mem.endDate)}</p>
              </div>
              <div>
                <small style="color: var(--color-muted-text); font-weight: 600; text-transform: uppercase;">Duration</small>
                <p style="font-weight: 700; color: var(--color-dark-text); font-size: 1.05rem;">${plan.durationMonths || 1} Month(s)</p>
              </div>
            </div>
          </div>

          <div style="text-align: right; min-width: 180px;">
            <p style="font-size: 0.85rem; color: var(--color-muted-text);">Need more time?</p>
            <button class="btn btn-outline-primary" style="margin-top: 6px;" onclick="switchTab('plans-tab')">
              🔄 Renew / Extend
            </button>
          </div>
        </div>
      `;
    } else {
      currentActiveMembership = null;
      statusEl.innerHTML = `<span class="badge badge-warning">No Active Plan</span>`;
      daysEl.innerText = `0 Days`;

      detailsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>No Active Membership</h3>
          <p>You do not have an active gym membership at this time. Choose a plan below to get started!</p>
          <button class="btn btn-primary" style="margin-top: 14px;" onclick="switchTab('plans-tab')">
            Subscribe to a Plan
          </button>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error fetching membership info:', err);
  }
}

// 2. Load Plans for Subscription
async function loadAvailablePlans() {
  try {
    const res = await fetch('/api/plans');
    const data = await res.json();
    const container = document.getElementById('member-plans-grid');

    if (data.success && data.plans && data.plans.length > 0) {
      container.innerHTML = data.plans.map(p => `
        <div class="plan-card ${p.popular ? 'popular' : ''}">
          ${p.popular ? '<span class="plan-badge">Most Popular</span>' : ''}
          <div class="plan-header">
            <h3 class="plan-name">${p.name}</h3>
            <p class="plan-desc">${p.description || 'Full gym facility access.'}</p>
            <div class="plan-price-wrap">
              <span class="plan-price">${formatCurrency(p.price)}</span>
              <span class="plan-duration">/ ${p.durationMonths} ${p.durationMonths === 1 ? 'month' : 'months'}</span>
            </div>
          </div>
          <ul class="plan-features">
            ${p.features && p.features.length > 0
              ? p.features.map(f => `<li>${f}</li>`).join('')
              : '<li>Full gym access</li>'}
          </ul>
          <button class="btn ${p.popular ? 'btn-primary' : 'btn-outline-primary'} btn-block" 
                  onclick="openDemoPaymentModal('${p._id}', '${escapeHtml(p.name)}', ${p.durationMonths}, ${p.price})">
            Select & Pay Demo
          </button>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<div class="empty-state">No membership plans currently available.</div>';
    }
  } catch (err) {
    console.error('Error loading plans:', err);
  }
}

// 3. Payment History
async function loadPaymentHistory() {
  try {
    const res = await fetch('/api/payments/my', { credentials: 'include' });
    const data = await res.json();

    const tbody = document.getElementById('payments-table-body');
    const totalEl = document.getElementById('stat-total-payments');
    const overviewContainer = document.getElementById('overview-recent-payments');

    if (data.success && data.payments && data.payments.length > 0) {
      const totalSum = data.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      totalEl.innerText = formatCurrency(totalSum);

      tbody.innerHTML = data.payments.map(p => `
        <tr>
          <td>${formatDate(p.createdAt)}</td>
          <td><code>${p.transactionRef}</code></td>
          <td><strong>${p.plan ? p.plan.name : 'Gym Plan'}</strong></td>
          <td>${formatCurrency(p.amount)}</td>
          <td><span class="badge badge-navy">${p.paymentMethod}</span></td>
          <td><span class="badge badge-success">Demo ${p.status}</span></td>
        </tr>
      `).join('');

      // Top 3 for overview
      overviewContainer.innerHTML = `
        <ul style="list-style: none; display: flex; flex-direction: column; gap: 10px;">
          ${data.payments.slice(0, 3).map(p => `
            <li style="display: flex; justify-content: space-between; font-size: 0.9rem; padding-bottom: 8px; border-bottom: 1px dashed var(--color-border);">
              <span><strong>${p.plan ? p.plan.name : 'Gym Plan'}</strong> (${formatDate(p.createdAt)})</span>
              <span style="font-weight: 700; color: var(--color-navy);">${formatCurrency(p.amount)}</span>
            </li>
          `).join('')}
        </ul>
      `;
    } else {
      totalEl.innerText = '₹0';
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No payment transactions recorded yet.</td></tr>`;
      overviewContainer.innerHTML = `<p style="color: var(--color-muted-text); font-size: 0.9rem;">No payment transactions recorded yet.</p>`;
    }
  } catch (err) {
    console.error('Error loading payments:', err);
  }
}

// 4. Attendance History
async function loadAttendanceHistory() {
  try {
    const res = await fetch('/api/attendance/my', { credentials: 'include' });
    const data = await res.json();

    const tbody = document.getElementById('attendance-table-body');
    const countEl = document.getElementById('stat-total-attendance');
    const overviewContainer = document.getElementById('overview-recent-attendance');

    if (data.success && data.records && data.records.length > 0) {
      countEl.innerText = `${data.count} Sessions`;

      tbody.innerHTML = data.records.map(r => {
        const d = new Date(r.date);
        const dayName = isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'long' });
        const badgeClass = r.status === 'Present' ? 'badge-success' : (r.status === 'Late' ? 'badge-warning' : 'badge-navy');

        return `
          <tr>
            <td>${formatDate(r.date)}</td>
            <td>${dayName}</td>
            <td><span class="badge ${badgeClass}">${r.status}</span></td>
            <td>${r.notes || 'General Workout Session'}</td>
          </tr>
        `;
      }).join('');

      // Top 3 for overview
      overviewContainer.innerHTML = `
        <ul style="list-style: none; display: flex; flex-direction: column; gap: 10px;">
          ${data.records.slice(0, 3).map(r => `
            <li style="display: flex; justify-content: space-between; font-size: 0.9rem; padding-bottom: 8px; border-bottom: 1px dashed var(--color-border);">
              <span>${formatDate(r.date)}</span>
              <span class="badge ${r.status === 'Present' ? 'badge-success' : 'badge-warning'}">${r.status}</span>
            </li>
          `).join('')}
        </ul>
      `;
    } else {
      countEl.innerText = '0 Sessions';
      tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No attendance records logged yet.</td></tr>`;
      overviewContainer.innerHTML = `<p style="color: var(--color-muted-text); font-size: 0.9rem;">No attendance logs yet.</p>`;
    }
  } catch (err) {
    console.error('Error loading attendance:', err);
  }
}

// 5. Feedback History
async function loadFeedbackHistory() {
  try {
    const res = await fetch('/api/feedback/my', { credentials: 'include' });
    const data = await res.json();
    const container = document.getElementById('feedback-history-list');

    if (data.success && data.feedbacks && data.feedbacks.length > 0) {
      container.innerHTML = data.feedbacks.map(f => {
        const stars = '⭐'.repeat(f.rating || 5);
        const statusBadge = f.status === 'Resolved' ? 'badge-success' : (f.status === 'Reviewed' ? 'badge-info' : 'badge-warning');

        return `
          <div style="border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 12px; background: #FAFBFD;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: var(--color-navy); font-size: 0.95rem;">${escapeHtml(f.subject)}</strong>
              <span class="badge ${statusBadge}">${f.status}</span>
            </div>
            <div style="font-size: 0.85rem; color: #F59E0B; margin-bottom: 4px;">${stars}</div>
            <p style="font-size: 0.9rem; color: #334155; margin-bottom: 8px;">${escapeHtml(f.message)}</p>
            <small style="color: var(--color-muted-text);">${formatDate(f.createdAt)}</small>

            ${f.adminResponse ? `
              <div style="margin-top: 10px; padding: 10px; background: #EFF6FF; border-left: 3px solid var(--color-primary); border-radius: 4px;">
                <strong style="font-size: 0.85rem; color: var(--color-primary);">Admin Response:</strong>
                <p style="font-size: 0.88rem; color: #1E3A8A; margin-top: 2px;">${escapeHtml(f.adminResponse)}</p>
                <small style="color: #64748B;">Responded on: ${formatDate(f.respondedAt)}</small>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    } else {
      container.innerHTML = '<div class="empty-state">You have not submitted any feedback yet.</div>';
    }
  } catch (err) {
    console.error('Error loading feedback:', err);
  }
}

// 6. Demo Payment Modal Handling
function openDemoPaymentModal(planId, name, duration, price) {
  document.getElementById('modal-plan-id').value = planId;
  document.getElementById('modal-plan-name').innerText = name;
  document.getElementById('modal-plan-duration').innerText = `${duration} Month${duration > 1 ? 's' : ''} Membership`;
  document.getElementById('modal-plan-price').innerText = formatCurrency(price);

  const modal = document.getElementById('demo-payment-modal');
  modal.style.display = 'flex';
}

function closeDemoPaymentModal() {
  const modal = document.getElementById('demo-payment-modal');
  modal.style.display = 'none';
}

// Event Listeners for Forms
function setupEventListeners() {
  // Demo payment submit
  const payForm = document.getElementById('demo-payment-form');
  if (payForm) {
    payForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const planId = document.getElementById('modal-plan-id').value;
      const paymentMethod = document.getElementById('payment-method').value;
      const submitBtn = document.getElementById('confirm-pay-btn');

      setLoading(submitBtn, true, 'Processing Demo Transaction...');

      try {
        const res = await fetch('/api/memberships/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ planId, paymentMethod })
        });

        const data = await res.json();

        if (data.success) {
          showToast(`Success! ${data.message}`, 'success');
          closeDemoPaymentModal();
          
          // Refresh member data
          await Promise.all([
            loadMembershipData(),
            loadPaymentHistory()
          ]);

          switchTab('overview-tab');
        } else {
          showToast(data.message || 'Payment simulation failed.', 'error');
        }
      } catch (err) {
        console.error('Payment error:', err);
        showToast('Network error while processing demo payment.', 'error');
      } finally {
        setLoading(submitBtn, false, 'Confirm Demo Payment');
      }
    });
  }

  // Feedback form submit
  const feedbackForm = document.getElementById('feedback-form');
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const subject = document.getElementById('feedback-subject').value.trim();
      const rating = document.getElementById('feedback-rating').value;
      const message = document.getElementById('feedback-message').value.trim();
      const submitBtn = document.getElementById('feedback-submit-btn');

      if (!subject || !message) {
        return showToast('Please enter both subject and message.', 'error');
      }

      setLoading(submitBtn, true, 'Submitting...');

      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ subject, rating, message })
        });

        const data = await res.json();

        if (data.success) {
          showToast(data.message, 'success');
          feedbackForm.reset();
          loadFeedbackHistory();
        } else {
          showToast(data.message || 'Error submitting feedback.', 'error');
        }
      } catch (err) {
        showToast('Server error sending feedback.', 'error');
      } finally {
        setLoading(submitBtn, false, 'Submit Feedback');
      }
    });
  }

  // Profile update submit
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('profile-fullName').value.trim();
      const phone = document.getElementById('profile-phone').value.trim();
      const address = document.getElementById('profile-address').value.trim();
      const submitBtn = document.getElementById('profile-save-btn');

      setLoading(submitBtn, true, 'Saving...');

      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ fullName, phone, address })
        });

        const data = await res.json();

        if (data.success) {
          showToast('Profile updated successfully!', 'success');
          document.getElementById('sidebar-name').innerText = fullName;
          document.getElementById('nav-user-greeting').innerText = `Hi, ${fullName.split(' ')[0]}`;
        } else {
          showToast(data.message || 'Failed to update profile.', 'error');
        }
      } catch (err) {
        showToast('Error updating profile.', 'error');
      } finally {
        setLoading(submitBtn, false, 'Save Changes');
      }
    });
  }
}

// Utility function to escape HTML strings
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}
