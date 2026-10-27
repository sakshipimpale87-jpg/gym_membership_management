/**
 * GymCare – Administrator Dashboard Controller
 */

let currentAdmin = null;
let allMembersCache = [];
let searchDebounceTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verify Admin Authentication
  const authenticated = await initAdminProfile();
  if (!authenticated) return;

  // 2. Setup Tab Switching
  setupAdminTabNavigation();

  // 3. Load Metrics & Initial Data
  await loadAdminStats();
  await loadAdminMembers();
  await loadAdminPlans();
  await loadAdminMemberships();
  await loadAdminPayments();
  await loadAttendanceDropdown();
  await loadAdminAttendance();
  await loadAdminFeedback();

  // Set default attendance date to today
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('attendance-date');
  if (dateInput) dateInput.value = today;

  // 4. Setup Form Listeners
  setupAdminForms();
});

// Admin Authentication Check
async function initAdminProfile() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const data = await res.json();

    if (!data.success || !data.user || data.user.role !== 'admin') {
      showToast('Admin privileges required. Please sign in as an administrator.', 'error');
      window.location.href = '/admin-login.html';
      return false;
    }

    currentAdmin = data.user;
    document.getElementById('admin-sidebar-name').innerText = currentAdmin.fullName;
    document.getElementById('admin-nav-greeting').innerText = `Admin: ${currentAdmin.fullName.split(' ')[0]}`;

    return true;
  } catch (err) {
    console.error('Admin auth check error:', err);
    window.location.href = '/admin-login.html';
    return false;
  }
}

// Tab Switching
function setupAdminTabNavigation() {
  const tabButtons = document.querySelectorAll('.sidebar-nav .tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchAdminTab(targetTab);
    });
  });
}

function switchAdminTab(tabId) {
  document.querySelectorAll('.dashboard-tab').forEach(sec => {
    sec.style.display = 'none';
  });

  document.querySelectorAll('.sidebar-nav .tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    }
  });

  const targetSection = document.getElementById(tabId);
  if (targetSection) {
    targetSection.style.display = 'block';
  }
}

// 1. Load Overview Statistics
async function loadAdminStats() {
  try {
    const res = await fetch('/api/admin/stats', { credentials: 'include' });
    const data = await res.json();

    if (data.success && data.stats) {
      const s = data.stats;
      document.getElementById('stat-total-members').innerText = s.totalMembers || 0;
      document.getElementById('stat-active-memberships').innerText = s.activeMemberships || 0;
      document.getElementById('stat-expired-memberships').innerText = s.expiredMemberships || 0;
      document.getElementById('stat-total-revenue').innerText = formatCurrency(s.totalRevenue || 0);
      document.getElementById('stat-today-attendance').innerText = s.todayAttendance || 0;
      document.getElementById('stat-pending-feedback').innerText = s.pendingFeedbacks || 0;
    }

    // Health check
    const healthRes = await fetch('/api/health');
    const healthData = await healthRes.json();
    const badge = document.getElementById('db-health-badge');
    if (badge) {
      if (healthData.database === 'connected') {
        badge.className = 'badge badge-success';
        badge.innerText = 'MongoDB Connected';
      } else {
        badge.className = 'badge badge-danger';
        badge.innerText = 'MongoDB Disconnected';
      }
    }
  } catch (err) {
    console.error('Error loading admin stats:', err);
  }
}

// 2. Member Management
async function loadAdminMembers(searchQuery = '') {
  try {
    const url = searchQuery ? `/api/admin/members?search=${encodeURIComponent(searchQuery)}` : '/api/admin/members';
    const res = await fetch(url, { credentials: 'include' });
    const data = await res.json();

    const tbody = document.getElementById('admin-members-table-body');

    if (data.success && data.members && data.members.length > 0) {
      allMembersCache = data.members;
      tbody.innerHTML = data.members.map(m => {
        const planName = m.activeMembership && m.activeMembership.plan ? m.activeMembership.plan.name : 'No Active Plan';
        const isPlanActive = m.activeMembership ? true : false;
        const statusBadge = m.status === 'active' ? 'badge-success' : 'badge-danger';

        return `
          <tr>
            <td>
              <strong>${escapeHtml(m.fullName)}</strong>
              <div style="font-size: 0.8rem; color: var(--color-muted-text);">Joined ${formatDate(m.createdAt)}</div>
            </td>
            <td><code>${escapeHtml(m.username)}</code></td>
            <td>
              <div>${escapeHtml(m.email)}</div>
              <small style="color: var(--color-muted-text);">${escapeHtml(m.phone)}</small>
            </td>
            <td>
              <span class="badge ${isPlanActive ? 'badge-success' : 'badge-navy'}">${planName}</span>
            </td>
            <td><span class="badge ${statusBadge}">${m.status}</span></td>
            <td>
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-sm btn-outline-primary" onclick="viewMemberDetails('${m._id}')">Profile</button>
                <button class="btn btn-sm ${m.status === 'active' ? 'btn-danger' : 'btn-success'}" 
                        onclick="toggleMemberStatus('${m._id}', '${m.status === 'active' ? 'suspended' : 'active'}')">
                  ${m.status === 'active' ? 'Suspend' : 'Activate'}
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No gym members found matching criteria.</td></tr>`;
    }
  } catch (err) {
    console.error('Error fetching members:', err);
  }
}

function debounceMemberSearch() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    const query = document.getElementById('member-search-input').value;
    loadAdminMembers(query);
  }, 350);
}

async function toggleMemberStatus(memberId, newStatus) {
  if (!confirm(`Are you sure you want to mark this member as "${newStatus}"?`)) return;

  try {
    const res = await fetch(`/api/admin/members/${memberId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      loadAdminMembers(document.getElementById('member-search-input').value);
    } else {
      showToast(data.message || 'Error updating member status.', 'error');
    }
  } catch (err) {
    showToast('Failed to update member status.', 'error');
  }
}

async function viewMemberDetails(memberId) {
  const modal = document.getElementById('member-details-modal');
  const container = document.getElementById('member-modal-content');
  modal.style.display = 'flex';
  container.innerHTML = '<div class="empty-state">Loading member profile...</div>';

  try {
    const res = await fetch(`/api/admin/members/${memberId}`, { credentials: 'include' });
    const data = await res.json();

    if (data.success && data.member) {
      const m = data.member;
      const mems = data.memberships || [];
      const payments = data.payments || [];
      const attendance = data.attendance || [];

      container.innerHTML = `
        <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--color-border);">
          <div style="width: 50px; height: 50px; border-radius: var(--radius-full); background: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700;">
            ${m.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style="font-size: 1.3rem; color: var(--color-navy); margin-bottom: 2px;">${escapeHtml(m.fullName)}</h3>
            <p style="color: var(--color-muted-text); font-size: 0.9rem;">
              @${escapeHtml(m.username)} | ${escapeHtml(m.email)} | ${escapeHtml(m.phone)}
            </p>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 1rem; color: var(--color-navy); margin-bottom: 8px;">Address:</h4>
          <p style="color: #475569; font-size: 0.9rem;">${escapeHtml(m.address)}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 1rem; color: var(--color-navy); margin-bottom: 8px;">Membership History (${mems.length})</h4>
          ${mems.length > 0 ? `
            <div class="table-responsive" style="max-height: 180px; overflow-y: auto;">
              <table class="table">
                <thead><tr><th>Plan</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
                <tbody>
                  ${mems.map(mem => `
                    <tr>
                      <td><strong>${mem.plan ? mem.plan.name : 'Plan'}</strong></td>
                      <td>${formatDate(mem.startDate)}</td>
                      <td>${formatDate(mem.endDate)}</td>
                      <td><span class="badge ${mem.status === 'active' ? 'badge-success' : 'badge-warning'}">${mem.status}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p style="color: var(--color-muted-text); font-size: 0.85rem;">No memberships on record.</p>'}
        </div>

        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 1rem; color: var(--color-navy); margin-bottom: 8px;">Simulated Demo Payments (${payments.length})</h4>
          <p style="font-size: 0.9rem; color: #475569;">Total Recorded: <strong>${formatCurrency(payments.reduce((s, p) => s + (p.amount || 0), 0))}</strong></p>
        </div>

        <div>
          <h4 style="font-size: 1rem; color: var(--color-navy); margin-bottom: 8px;">Recent Attendance Logs (${attendance.length})</h4>
          <p style="font-size: 0.9rem; color: #475569;">Recorded Sessions: <strong>${attendance.length} sessions</strong></p>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Failed to load member profile.</div>';
  }
}

function closeMemberDetailsModal() {
  document.getElementById('member-details-modal').style.display = 'none';
}

// 3. Plan Management
async function loadAdminPlans() {
  try {
    const res = await fetch('/api/plans', { credentials: 'include' });
    const data = await res.json();
    const container = document.getElementById('admin-plans-grid');

    if (data.success && data.plans && data.plans.length > 0) {
      container.innerHTML = data.plans.map(p => `
        <div class="plan-card ${p.popular ? 'popular' : ''}" style="${!p.isActive ? 'opacity: 0.6;' : ''}">
          ${p.popular ? '<span class="plan-badge">Popular</span>' : ''}
          <div class="plan-header">
            <h3 class="plan-name">${escapeHtml(p.name)}</h3>
            <p class="plan-desc">${escapeHtml(p.description || '')}</p>
            <div class="plan-price-wrap">
              <span class="plan-price">${formatCurrency(p.price)}</span>
              <span class="plan-duration">/ ${p.durationMonths} Mo</span>
            </div>
          </div>
          <ul class="plan-features">
            ${p.features && p.features.length > 0 ? p.features.map(f => `<li>${escapeHtml(f)}</li>`).join('') : '<li>Gym Access</li>'}
          </ul>
          <div style="display: flex; gap: 8px; margin-top: auto;">
            <button class="btn btn-sm btn-outline-primary" style="flex: 1;" onclick='openEditPlanModal(${JSON.stringify(p)})'>
              Edit Plan
            </button>
            <button class="btn btn-sm ${p.isActive ? 'btn-danger' : 'btn-success'}" onclick="togglePlanActive('${p._id}', ${!p.isActive})">
              ${p.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<div class="empty-state">No membership plans created yet. Click "+ Add New Plan" to create one.</div>';
    }
  } catch (err) {
    console.error('Error loading admin plans:', err);
  }
}

function openAddPlanModal() {
  document.getElementById('plan-modal-title').innerText = 'Add New Membership Plan';
  document.getElementById('plan-modal-id').value = '';
  document.getElementById('plan-modal-form').reset();
  document.getElementById('plan-modal').style.display = 'flex';
}

function openEditPlanModal(plan) {
  document.getElementById('plan-modal-title').innerText = 'Edit Membership Plan';
  document.getElementById('plan-modal-id').value = plan._id;
  document.getElementById('plan-modal-name').value = plan.name;
  document.getElementById('plan-modal-duration').value = plan.durationMonths;
  document.getElementById('plan-modal-price').value = plan.price;
  document.getElementById('plan-modal-desc').value = plan.description || '';
  document.getElementById('plan-modal-features').value = (plan.features || []).join('\n');
  document.getElementById('plan-modal-popular').checked = Boolean(plan.popular);
  document.getElementById('plan-modal').style.display = 'flex';
}

function closePlanModal() {
  document.getElementById('plan-modal').style.display = 'none';
}

async function togglePlanActive(planId, activate) {
  try {
    const res = await fetch(`/api/plans/${planId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isActive: activate })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Plan ${activate ? 'activated' : 'deactivated'} successfully.`, 'success');
      loadAdminPlans();
    }
  } catch (err) {
    showToast('Failed to update plan status.', 'error');
  }
}

// 4. All Memberships Management
async function loadAdminMemberships() {
  try {
    const filter = document.getElementById('membership-filter-status').value;
    const url = filter ? `/api/admin/memberships?status=${filter}` : '/api/admin/memberships';
    const res = await fetch(url, { credentials: 'include' });
    const data = await res.json();
    const tbody = document.getElementById('admin-memberships-table-body');

    if (data.success && data.memberships && data.memberships.length > 0) {
      tbody.innerHTML = data.memberships.map(mem => {
        const u = mem.user || {};
        const p = mem.plan || {};
        const statusBadge = mem.status === 'active' ? 'badge-success' : 'badge-warning';

        return `
          <tr>
            <td>
              <strong>${escapeHtml(u.fullName || 'Member')}</strong>
              <div style="font-size: 0.8rem; color: var(--color-muted-text);">@${escapeHtml(u.username || '')}</div>
            </td>
            <td><strong>${escapeHtml(p.name || 'Plan')}</strong></td>
            <td>${formatDate(mem.startDate)}</td>
            <td>${formatDate(mem.endDate)}</td>
            <td><span class="badge ${statusBadge}">${mem.status}</span></td>
            <td>
              <button class="btn btn-sm btn-outline-primary" 
                      onclick="openExtendModal('${mem._id}', '${escapeHtml(u.fullName || 'Member')}', '${formatDate(mem.endDate)}')">
                Extend / Edit
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No memberships found.</td></tr>`;
    }
  } catch (err) {
    console.error('Error fetching memberships:', err);
  }
}

function openExtendModal(id, memberName, endDate) {
  document.getElementById('extend-membership-id').value = id;
  document.getElementById('extend-member-name').innerText = memberName;
  document.getElementById('extend-current-end').innerText = `Current End Date: ${endDate}`;
  document.getElementById('extend-membership-modal').style.display = 'flex';
}

function closeExtendModal() {
  document.getElementById('extend-membership-modal').style.display = 'none';
}

// 5. Demo Payments Ledger
async function loadAdminPayments() {
  try {
    const res = await fetch('/api/payments/all', { credentials: 'include' });
    const data = await res.json();
    const tbody = document.getElementById('admin-payments-table-body');

    if (data.success && data.payments && data.payments.length > 0) {
      tbody.innerHTML = data.payments.map(p => {
        const u = p.user || {};
        const plan = p.plan || {};

        return `
          <tr>
            <td>${formatDate(p.createdAt)}</td>
            <td><code>${p.transactionRef}</code></td>
            <td>
              <strong>${escapeHtml(u.fullName || 'Member')}</strong>
              <div style="font-size: 0.8rem; color: var(--color-muted-text);">@${escapeHtml(u.username || '')}</div>
            </td>
            <td>${escapeHtml(plan.name || 'Gym Plan')}</td>
            <td><strong>${formatCurrency(p.amount)}</strong></td>
            <td><span class="badge badge-navy">${p.paymentMethod}</span></td>
            <td><span class="badge badge-success">Demo ${p.status}</span></td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No demo payments logged yet.</td></tr>`;
    }
  } catch (err) {
    console.error('Error fetching admin payments:', err);
  }
}

// 6. Attendance Management
async function loadAttendanceDropdown() {
  try {
    const res = await fetch('/api/admin/members', { credentials: 'include' });
    const data = await res.json();
    const select = document.getElementById('attendance-member-select');

    if (data.success && data.members) {
      select.innerHTML = '<option value="">-- Choose registered member --</option>' +
        data.members.map(m => `<option value="${m._id}">${escapeHtml(m.fullName)} (@${escapeHtml(m.username)})</option>`).join('');
    }
  } catch (err) {
    console.error('Error loading attendance dropdown:', err);
  }
}

async function loadAdminAttendance() {
  try {
    const res = await fetch('/api/attendance/all', { credentials: 'include' });
    const data = await res.json();
    const tbody = document.getElementById('admin-attendance-table-body');

    if (data.success && data.records && data.records.length > 0) {
      tbody.innerHTML = data.records.map(r => {
        const u = r.user || {};
        const badge = r.status === 'Present' ? 'badge-success' : (r.status === 'Late' ? 'badge-warning' : 'badge-navy');

        return `
          <tr>
            <td>${formatDate(r.date)}</td>
            <td><strong>${escapeHtml(u.fullName || 'Member')}</strong></td>
            <td><span class="badge ${badge}">${r.status}</span></td>
            <td>${escapeHtml(r.notes || '-')}</td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No attendance records logged yet.</td></tr>`;
    }
  } catch (err) {
    console.error('Error fetching admin attendance:', err);
  }
}

// 7. Feedback Management
async function loadAdminFeedback() {
  try {
    const res = await fetch('/api/feedback/all', { credentials: 'include' });
    const data = await res.json();
    const container = document.getElementById('admin-feedback-list');

    if (data.success && data.feedbacks && data.feedbacks.length > 0) {
      container.innerHTML = data.feedbacks.map(f => {
        const u = f.user || {};
        const stars = '⭐'.repeat(f.rating || 5);
        const statusBadge = f.status === 'Resolved' ? 'badge-success' : (f.status === 'Reviewed' ? 'badge-info' : 'badge-warning');

        return `
          <div class="card" style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
              <div>
                <strong style="font-size: 1.1rem; color: var(--color-navy);">${escapeHtml(f.subject)}</strong>
                <p style="font-size: 0.85rem; color: var(--color-muted-text); margin-top: 2px;">
                  From: <strong>${escapeHtml(u.fullName || 'Member')}</strong> (@${escapeHtml(u.username || '')}) | Submitted on ${formatDate(f.createdAt)}
                </p>
                <div style="font-size: 0.85rem; color: #F59E0B; margin: 4px 0;">${stars}</div>
              </div>
              <div>
                <span class="badge ${statusBadge}">${f.status}</span>
                <button class="btn btn-sm btn-outline-primary" style="margin-left: 8px;"
                        onclick="openReplyModal('${f._id}', '${escapeHtml(u.fullName || 'Member')}', '${escapeHtml(f.subject)}', '${escapeHtml(f.message)}')">
                  Reply / Resolve
                </button>
              </div>
            </div>

            <p style="margin-top: 10px; font-size: 0.95rem; color: #334155; line-height: 1.5;">${escapeHtml(f.message)}</p>

            ${f.adminResponse ? `
              <div style="margin-top: 14px; padding: 12px; background: #EFF6FF; border-left: 3px solid var(--color-primary); border-radius: 4px;">
                <strong style="font-size: 0.85rem; color: var(--color-primary);">Gym Response:</strong>
                <p style="font-size: 0.9rem; color: #1E3A8A; margin-top: 2px;">${escapeHtml(f.adminResponse)}</p>
                <small style="color: #64748B;">Responded: ${formatDate(f.respondedAt)}</small>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    } else {
      container.innerHTML = '<div class="empty-state">No member feedback received yet.</div>';
    }
  } catch (err) {
    console.error('Error fetching admin feedback:', err);
  }
}

function openReplyModal(id, memberName, subject, message) {
  document.getElementById('reply-feedback-id').value = id;
  document.getElementById('reply-user-name').innerText = `Feedback from: ${memberName}`;
  document.getElementById('reply-subject').innerText = `Subject: ${subject}`;
  document.getElementById('reply-message').innerText = `Message: "${message}"`;
  document.getElementById('admin-reply-text').value = '';
  document.getElementById('reply-feedback-modal').style.display = 'flex';
}

function closeReplyModal() {
  document.getElementById('reply-feedback-modal').style.display = 'none';
}

// Form Handlers
function setupAdminForms() {
  // 1. Plan Form (Add / Edit)
  const planForm = document.getElementById('plan-modal-form');
  if (planForm) {
    planForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const planId = document.getElementById('plan-modal-id').value;
      const name = document.getElementById('plan-modal-name').value.trim();
      const durationMonths = document.getElementById('plan-modal-duration').value;
      const price = document.getElementById('plan-modal-price').value;
      const description = document.getElementById('plan-modal-desc').value.trim();
      const features = document.getElementById('plan-modal-features').value;
      const popular = document.getElementById('plan-modal-popular').checked;
      const saveBtn = document.getElementById('save-plan-btn');

      setLoading(saveBtn, true, 'Saving Plan...');

      const payload = { name, durationMonths, price, description, features, popular };
      const method = planId ? 'PUT' : 'POST';
      const endpoint = planId ? `/api/plans/${planId}` : '/api/plans';

      try {
        const res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          closePlanModal();
          loadAdminPlans();
          loadAdminStats();
        } else {
          showToast(data.message || 'Error saving plan.', 'error');
        }
      } catch (err) {
        showToast('Server error while saving plan.', 'error');
      } finally {
        setLoading(saveBtn, false, 'Save Plan');
      }
    });
  }

  // 2. Mark Attendance Form
  const attForm = document.getElementById('mark-attendance-form');
  if (attForm) {
    attForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userId = document.getElementById('attendance-member-select').value;
      const date = document.getElementById('attendance-date').value;
      const status = document.getElementById('attendance-status').value;
      const notes = document.getElementById('attendance-notes').value.trim();
      const btn = document.getElementById('mark-attendance-btn');

      if (!userId) {
        return showToast('Please select a member first.', 'error');
      }

      setLoading(btn, true, 'Marking Check-in...');

      try {
        const res = await fetch('/api/attendance/mark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId, date, status, notes })
        });

        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          attForm.reset();
          document.getElementById('attendance-date').value = new Date().toISOString().split('T')[0];
          loadAdminAttendance();
          loadAdminStats();
        } else {
          showToast(data.message || 'Error recording attendance.', 'error');
        }
      } catch (err) {
        showToast('Server error marking attendance.', 'error');
      } finally {
        setLoading(btn, false, 'Mark Check-in');
      }
    });
  }

  // 3. Extend Membership Form
  const extForm = document.getElementById('extend-membership-form');
  if (extForm) {
    extForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const memId = document.getElementById('extend-membership-id').value;
      const extendMonths = document.getElementById('extend-months-select').value;
      const status = document.getElementById('extend-status-select').value;
      const btn = document.getElementById('save-extend-btn');

      setLoading(btn, true, 'Applying Extension...');

      try {
        const res = await fetch(`/api/admin/memberships/${memId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ extendMonths, status })
        });

        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          closeExtendModal();
          loadAdminMemberships();
          loadAdminStats();
        } else {
          showToast(data.message || 'Error updating membership.', 'error');
        }
      } catch (err) {
        showToast('Server error extending membership.', 'error');
      } finally {
        setLoading(btn, false, 'Apply Extension');
      }
    });
  }

  // 4. Reply Feedback Form
  const replyForm = document.getElementById('reply-feedback-form');
  if (replyForm) {
    replyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('reply-feedback-id').value;
      const adminResponse = document.getElementById('admin-reply-text').value.trim();
      const status = document.getElementById('feedback-new-status').value;
      const btn = document.getElementById('send-reply-btn');

      if (!adminResponse) {
        return showToast('Please enter an official response.', 'error');
      }

      setLoading(btn, true, 'Submitting Response...');

      try {
        const res = await fetch(`/api/feedback/${id}/reply`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ adminResponse, status })
        });

        const data = await res.json();
        if (data.success) {
          showToast(data.message, 'success');
          closeReplyModal();
          loadAdminFeedback();
          loadAdminStats();
        } else {
          showToast(data.message || 'Error submitting response.', 'error');
        }
      } catch (err) {
        showToast('Server error replying to feedback.', 'error');
      } finally {
        setLoading(btn, false, 'Submit Response');
      }
    });
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}
