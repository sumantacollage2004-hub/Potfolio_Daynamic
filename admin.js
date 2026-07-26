/* ==========================================================================
   ADMIN PORTAL STATE & CONFIG
   ========================================================================== */
const ADMIN_STATE = {
  token: localStorage.getItem('portfolio_admin_token') || null,
  portfolioData: {},
  activeTab: 'tab-metrics',
  metricsInterval: null
};

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initTabs();
  initModals();
  initFilePreviews();
});

/* ==========================================================================
   TOAST NOTIFICATION ENGINE
   ========================================================================== */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconMap = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    info: 'fa-info-circle'
  };
  const icon = iconMap[type] || 'fa-info-circle';
  
  toast.innerHTML = `
    <i class="fas ${icon} toast-icon"></i>
    <div class="toast-message">${message}</div>
  `;
  
  container.appendChild(toast);
  
  // Trigger slide-in transition
  setTimeout(() => toast.classList.add('show'), 50);
  
  // Auto-remove toast card after 3.5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

/* ==========================================================================
   AUTHENTICATION LOGIC
   ========================================================================== */
function initAuth() {
  const loginForm = document.getElementById('admin-login-form');
  const logoutBtn = document.getElementById('btn-console-logout');
  
  if (ADMIN_STATE.token) {
    validateAndUnlock();
  } else {
    showLoginScreen();
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('admin-login-passcode').value;
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Passcode incorrect');
      
      ADMIN_STATE.token = data.token;
      localStorage.setItem('portfolio_admin_token', data.token);
      
      validateAndUnlock();
      showToast('Unlock successful! Welcome to your dashboard.', 'success');
      loginForm.reset();
      
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  logoutBtn.addEventListener('click', () => {
    ADMIN_STATE.token = null;
    localStorage.removeItem('portfolio_admin_token');
    showLoginScreen();
    showToast('You have logged out of the admin console.', 'info');
  });
}

function showLoginScreen() {
  document.getElementById('admin-auth-screen').classList.remove('hidden');
  document.getElementById('admin-panel-console').classList.add('hidden');
  if (ADMIN_STATE.metricsInterval) clearInterval(ADMIN_STATE.metricsInterval);
}

async function validateAndUnlock() {
  const success = await loadMetrics();
  if (success) {
    document.getElementById('admin-auth-screen').classList.add('hidden');
    document.getElementById('admin-panel-console').classList.remove('hidden');
    
    // Load database details
    loadConsoleData();
    
    // Set up real-time analytics polling (every 10 seconds)
    if (ADMIN_STATE.metricsInterval) clearInterval(ADMIN_STATE.metricsInterval);
    ADMIN_STATE.metricsInterval = setInterval(loadMetrics, 10000);
  } else {
    showLoginScreen();
  }
}

/* ==========================================================================
   METRICS & REAL-TIME ANALYTICS
   ========================================================================== */
async function loadMetrics() {
  if (!ADMIN_STATE.token) return false;
  
  try {
    const res = await fetch('/api/analytics/metrics', {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    
    if (!res.ok) {
      if (res.status === 403) {
        localStorage.removeItem('portfolio_admin_token');
        ADMIN_STATE.token = null;
      }
      return false;
    }
    
    const data = await res.json();
    
    // Render statistics counters
    document.getElementById('metric-visits').textContent = data.total_visits;
    document.getElementById('metric-reach').textContent = data.total_reach;
    
    // Render searches table
    const searchBody = document.getElementById('metrics-search-queries');
    searchBody.innerHTML = '';
    if (data.searches.length === 0) {
      searchBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No search query data logged yet.</td></tr>';
    } else {
      data.searches.forEach(s => {
        const tr = document.createElement('tr');
        const formattedDate = new Date(s.last_searched).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(s.last_searched).toLocaleDateString();
        tr.innerHTML = `
          <td><code>${s.term}</code></td>
          <td>${s.count} times</td>
          <td>${formattedDate}</td>
        `;
        searchBody.appendChild(tr);
      });
    }
    
    // Render clicks table
    const clickBody = document.getElementById('metrics-clicks');
    clickBody.innerHTML = '';
    if (data.clicks.length === 0) {
      clickBody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No click interactions recorded.</td></tr>';
    } else {
      data.clicks.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><i class="fab fa-${c.channel.toLowerCase()}"></i> ${c.channel}</td>
          <td>${c.count} clicks</td>
        `;
        clickBody.appendChild(tr);
      });
    }
    
    return true;
  } catch (err) {
    console.error('Failed to load metrics:', err);
    return false;
  }
}

/* ==========================================================================
   CONSOLE DATA LOADING
   ========================================================================== */
async function loadConsoleData() {
  try {
    const res = await fetch('/api/portfolio');
    if (!res.ok) throw new Error('Failed to fetch portfolio data');
    const data = await res.json();
    
    ADMIN_STATE.portfolioData = data;
    
    // Populate Form fields and Tables
    populateProfileForm(data.settings);
    populateProjectsTable(data.projects);
    populateSkillsEditor(data.skills);
    populateTimelineTable(data.timeline);
    
    // Fetch and populate guest contact messages
    loadInboxMessages();
    
  } catch (err) {
    showToast('Failed to load console details: ' + err.message, 'error');
  }
}

/* ==========================================================================
   TAB NAVIGATION
   ========================================================================== */
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const targetId = tab.getAttribute('data-target');
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
      });
      document.getElementById(targetId).classList.add('active');
      ADMIN_STATE.activeTab = targetId;
    });
  });
}

/* ==========================================================================
   MODAL WINDOW OPERATIONS
   ========================================================================== */
function initModals() {
  document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
        const modalId = e.target.closest('.modal-overlay').id;
        document.getElementById(modalId).classList.remove('active');
      }
    });
  });
}

/* ==========================================================================
   FILE PREVIEW HOOKS
   ========================================================================== */
function initFilePreviews() {
  const avatarInput = document.getElementById('admin-file-avatar');
  if (avatarInput) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        document.getElementById('avatar-preview-img').src = URL.createObjectURL(file);
      }
    });
  }
  
  const headerLogoInput = document.getElementById('admin-file-header-logo');
  if (headerLogoInput) {
    headerLogoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        document.getElementById('header-logo-preview-img').src = URL.createObjectURL(file);
      }
    });
  }
}

/* ==========================================================================
   PROFILE SETTINGS SUBMISSIONS
   ========================================================================== */
function populateProfileForm(s) {
  document.getElementById('admin-prof-name').value = s.name || '';
  document.getElementById('admin-prof-bio').value = s.bio || '';
  document.getElementById('admin-prof-detailed-bio').value = s.detailed_bio || '';
  document.getElementById('admin-prof-location').value = s.location || '';
  document.getElementById('admin-prof-map').value = s.map_query || '';
  document.getElementById('admin-prof-email').value = s.email || '';
  document.getElementById('admin-prof-phone').value = s.phone || '';
  
  document.getElementById('admin-prof-github').value = s.github_username || '';
  document.getElementById('admin-prof-linkedin').value = s.linkedin_url || '';
  document.getElementById('admin-prof-followers').value = s.stat_linkedin_followers || '';
  document.getElementById('admin-prof-stars').value = s.stat_stars || '';
  document.getElementById('admin-prof-twitter').value = s.twitter_url || '';
  document.getElementById('admin-prof-discord').value = s.discord_url || '';
  document.getElementById('admin-prof-password').value = '';
  
  if (s.avatar_path) {
    document.getElementById('avatar-preview-img').src = s.avatar_path;
  }
  if (s.header_logo_path) {
    document.getElementById('header-logo-preview-img').src = s.header_logo_path;
  }
}

document.getElementById('console-profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Upload files if present
  let avatar_path = ADMIN_STATE.portfolioData.settings.avatar_path;
  const avatarFile = document.getElementById('admin-file-avatar').files[0];
  if (avatarFile) {
    const url = await uploadFileAPI(avatarFile);
    if (url) avatar_path = url;
  }

  let header_logo_path = ADMIN_STATE.portfolioData.settings.header_logo_path;
  const headerLogoFile = document.getElementById('admin-file-header-logo').files[0];
  if (headerLogoFile) {
    const url = await uploadFileAPI(headerLogoFile);
    if (url) header_logo_path = url;
  }
  
  let cover_paths = ADMIN_STATE.portfolioData.settings.cover_paths || [];
  const coverFiles = document.getElementById('admin-file-covers').files;
  if (coverFiles.length > 0) {
    const uploadedUrls = [];
    for (let i = 0; i < coverFiles.length; i++) {
      const url = await uploadFileAPI(coverFiles[i]);
      if (url) uploadedUrls.push(url);
    }
    if (uploadedUrls.length > 0) cover_paths = uploadedUrls;
  }
  
  const payload = {
    name: document.getElementById('admin-prof-name').value,
    bio: document.getElementById('admin-prof-bio').value,
    detailed_bio: document.getElementById('admin-prof-detailed-bio').value,
    location: document.getElementById('admin-prof-location').value,
    map_query: document.getElementById('admin-prof-map').value,
    email: document.getElementById('admin-prof-email').value,
    phone: document.getElementById('admin-prof-phone').value,
    github_username: document.getElementById('admin-prof-github').value,
    linkedin_url: document.getElementById('admin-prof-linkedin').value,
    stat_linkedin_followers: document.getElementById('admin-prof-followers').value,
    stat_stars: document.getElementById('admin-prof-stars').value,
    twitter_url: document.getElementById('admin-prof-twitter').value,
    discord_url: document.getElementById('admin-prof-discord').value,
    avatar_path: avatar_path,
    header_logo_path: header_logo_path,
    cover_paths: cover_paths
  };
  
  const newPass = document.getElementById('admin-prof-password').value.trim();
  if (newPass) {
    payload.admin_password = newPass;
  }
  
  try {
    const res = await fetch('/api/portfolio/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error('Failed to update profile settings');
    
    showToast('Profile configuration saved successfully!', 'success');
    loadConsoleData();
    
  } catch (err) {
    showToast(err.message, 'error');
  }
});

/* ==========================================================================
   CUSTOM PROJECTS MANAGER
   ========================================================================== */
function populateProjectsTable(projects) {
  const tbody = document.getElementById('console-projects-tbody');
  tbody.innerHTML = '';
  
  if (projects.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No custom projects in database. Click Create Project to upload.</td></tr>';
    return;
  }
  
  projects.forEach(p => {
    const tr = document.createElement('tr');
    
    const imgHTML = p.image_url 
      ? `<div style="display:flex; width: 50px; height: 35px; position: relative;">
           <img src="${p.image_url}" class="table-img-thumb" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="table-img-placeholder" style="display:none; width: 50px; height: 35px; background: rgba(255,255,255,0.05); border-radius: 4px; align-items: center; justify-content: center; border: 1px solid var(--border-color);"><i class="far fa-folder text-muted"></i></div>
         </div>`
      : `<div class="table-img-placeholder" style="width: 50px; height: 35px; background: rgba(255,255,255,0.05); border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color);"><i class="far fa-folder text-muted"></i></div>`;
      
    tr.innerHTML = `
      <td>${imgHTML}</td>
      <td><strong>${p.name}</strong></td>
      <td><span class="badge">${p.language || 'HTML'}</span></td>
      <td><a href="${p.github_url || '#'}" target="_blank" class="table-url-link">${p.github_url ? 'github.com' : 'No link'}</a></td>
      <td>${p.is_featured === 1 ? '<i class="fas fa-check text-success"></i>' : '<i class="fas fa-times text-muted"></i>'}</td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-sm btn-outline-secondary" onclick="openEditProject(${p.id})"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteProject(${p.id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('btn-console-add-project').addEventListener('click', () => {
  document.getElementById('admin-project-form').reset();
  document.getElementById('admin-proj-id-input').value = '';
  document.getElementById('admin-proj-modal-title').textContent = 'Upload New Project';
  document.getElementById('admin-project-modal').classList.add('active');
});

window.openEditProject = function(id) {
  const p = ADMIN_STATE.portfolioData.projects.find(proj => proj.id === id);
  if (!p) return;
  
  document.getElementById('admin-proj-id-input').value = p.id;
  document.getElementById('admin-proj-name').value = p.name;
  document.getElementById('admin-proj-desc').value = p.description;
  document.getElementById('admin-proj-lang').value = p.language;
  document.getElementById('admin-proj-github').value = p.github_url || '';
  document.getElementById('admin-proj-live').value = p.live_url || '';
  document.getElementById('admin-proj-image-url').value = p.image_url || '';
  document.getElementById('admin-proj-featured').checked = p.is_featured === 1;
  
  document.getElementById('admin-proj-modal-title').textContent = 'Edit Project Details';
  document.getElementById('admin-project-modal').classList.add('active');
};

document.getElementById('admin-project-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('admin-proj-id-input').value;
  
  let image_url = document.getElementById('admin-proj-image-url').value;
  const coverFile = document.getElementById('admin-proj-image-file').files[0];
  if (coverFile) {
    const url = await uploadFileAPI(coverFile);
    if (url) image_url = url;
  }
  
  const payload = {
    name: document.getElementById('admin-proj-name').value,
    description: document.getElementById('admin-proj-desc').value,
    language: document.getElementById('admin-proj-lang').value,
    github_url: document.getElementById('admin-proj-github').value,
    live_url: document.getElementById('admin-proj-live').value,
    image_url: image_url,
    is_featured: document.getElementById('admin-proj-featured').checked ? 1 : 0
  };
  
  let url = '/api/projects';
  let method = 'POST';
  if (id) {
    url += `/${id}`;
    method = 'PUT';
  }
  
  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error('Failed to save project');
    
    document.getElementById('admin-project-modal').classList.remove('active');
    showToast(`Project "${payload.name}" saved successfully!`, 'success');
    loadConsoleData();
    
  } catch (err) {
    showToast(err.message, 'error');
  }
});

window.deleteProject = async function(id) {
  if (!confirm('Are you sure you want to delete this custom project?')) return;
  
  try {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    if (!res.ok) throw new Error('Deletion request failed');
    
    showToast('Project deleted successfully.', 'info');
    loadConsoleData();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

/* ==========================================================================
   SKILLS DATABASE MANAGER
   ========================================================================== */
function populateSkillsEditor(skills) {
  const rows = document.getElementById('console-skills-rows');
  rows.innerHTML = '';
  
  skills.forEach(s => {
    addSkillRow(s.category, s.name, s.percentage);
  });
}

document.getElementById('btn-console-add-skill').addEventListener('click', () => {
  addSkillRow('Frontend Development', 'New Skill', 80);
});

function addSkillRow(category, name, percentage) {
  const container = document.getElementById('console-skills-rows');
  const div = document.createElement('div');
  div.className = 'skill-row';
  
  div.innerHTML = `
    <select class="skill-row-cat">
      <option value="Frontend Development" ${category === 'Frontend Development' ? 'selected' : ''}>Frontend</option>
      <option value="Backend & Databases" ${category === 'Backend & Databases' ? 'selected' : ''}>Backend & DB</option>
      <option value="DevOps & Workflows" ${category === 'DevOps & Workflows' ? 'selected' : ''}>DevOps & Workflows</option>
      <option value="Core Competencies" ${category === 'Core Competencies' ? 'selected' : ''}>Core Competencies</option>
    </select>
    <input type="text" class="skill-row-name" placeholder="Skill Name" value="${name}" required>
    <input type="number" class="skill-row-pct" placeholder="%" value="${percentage}" min="0" max="100" required>
    <button type="button" class="btn-row-delete" onclick="this.closest('.skill-row').remove()"><i class="fas fa-trash"></i></button>
  `;
  container.appendChild(div);
}

document.getElementById('console-skills-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const rows = document.querySelectorAll('#console-skills-rows .skill-row');
  const skillsArray = [];
  
  rows.forEach(r => {
    const category = r.querySelector('.skill-row-cat').value;
    const name = r.querySelector('.skill-row-name').value;
    const percentage = r.querySelector('.skill-row-pct').value;
    if (name) {
      skillsArray.push({ category, name, percentage: parseInt(percentage) });
    }
  });
  
  try {
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify({ skills: skillsArray })
    });
    
    if (!res.ok) throw new Error('Failed to update skills database');
    
    showToast('Skills database updated successfully!', 'success');
    loadConsoleData();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

/* ==========================================================================
   TIMELINE LOGS MANAGER
   ========================================================================== */
function populateTimelineTable(timeline) {
  const tbody = document.getElementById('console-timeline-tbody');
  tbody.innerHTML = '';
  
  if (timeline.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No timeline events logged.</td></tr>';
    return;
  }
  
  timeline.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.date_range}</td>
      <td><span class="badge">${t.type.toUpperCase()}</span></td>
      <td><strong>${t.title}</strong></td>
      <td>${t.organization}</td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-sm btn-outline-secondary" onclick="openEditTimeline(${t.id})"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteTimeline(${t.id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('btn-console-add-timeline').addEventListener('click', () => {
  document.getElementById('admin-timeline-form').reset();
  document.getElementById('admin-time-id-input').value = '';
  document.getElementById('admin-time-modal-title').textContent = 'Create Timeline Log';
  document.getElementById('admin-timeline-modal').classList.add('active');
});

window.openEditTimeline = function(id) {
  const t = ADMIN_STATE.portfolioData.timeline.find(time => time.id === id);
  if (!t) return;
  
  document.getElementById('admin-time-id-input').value = t.id;
  document.getElementById('admin-time-type').value = t.type;
  document.getElementById('admin-time-title').value = t.title;
  document.getElementById('admin-time-org').value = t.organization;
  document.getElementById('admin-time-date').value = t.date_range;
  document.getElementById('admin-time-desc').value = t.description;
  document.getElementById('admin-time-logo-url').value = t.logo_path || '';
  
  document.getElementById('admin-time-modal-title').textContent = 'Edit Timeline Event';
  document.getElementById('admin-timeline-modal').classList.add('active');
};

document.getElementById('admin-timeline-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('admin-time-id-input').value;
  
  let logo_path = document.getElementById('admin-time-logo-url').value;
  const logoFile = document.getElementById('admin-time-logo-file').files[0];
  if (logoFile) {
    const url = await uploadFileAPI(logoFile);
    if (url) logo_path = url;
  }
  
  const payload = {
    type: document.getElementById('admin-time-type').value,
    title: document.getElementById('admin-time-title').value,
    organization: document.getElementById('admin-time-org').value,
    date_range: document.getElementById('admin-time-date').value,
    description: document.getElementById('admin-time-desc').value,
    logo_path: logo_path
  };
  
  let url = '/api/timeline';
  let method = 'POST';
  if (id) {
    url += `/${id}`;
    method = 'PUT';
  }
  
  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_STATE.token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error('Failed to save timeline log');
    document.getElementById('admin-timeline-modal').classList.remove('active');
    
    showToast('Timeline log saved successfully!', 'success');
    loadConsoleData();
    
  } catch (err) {
    showToast(err.message, 'error');
  }
});

window.deleteTimeline = async function(id) {
  if (!confirm('Are you sure you want to delete this timeline event?')) return;
  
  try {
    const res = await fetch(`/api/timeline/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    if (!res.ok) throw new Error('Deletion request failed');
    
    showToast('Timeline log deleted.', 'info');
    loadConsoleData();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

/* ==========================================================================
   UPLOAD API HELPER
   ========================================================================== */
async function uploadFileAPI(file) {
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` },
      body: formData
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload request failed');
    return data.url;
  } catch (err) {
    showToast(err.message, 'error');
    return null;
  }
}

/* ==========================================================================
   CONTACT INBOX HANDLERS
   ========================================================================== */
async function loadInboxMessages() {
  if (!ADMIN_STATE.token) return;
  
  try {
    const res = await fetch('/api/contact/messages', {
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    
    if (!res.ok) throw new Error('Failed to load guest messages');
    
    const messages = await res.json();
    ADMIN_STATE.contactsData = messages;
    
    populateContactsTable(messages);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function populateContactsTable(messages) {
  const tbody = document.getElementById('console-contacts-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (messages.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No messages in inbox.</td></tr>';
    return;
  }
  
  messages.forEach(m => {
    const tr = document.createElement('tr');
    const dateStr = new Date(m.timestamp).toLocaleDateString() + ' ' + new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td><strong>${m.name}</strong></td>
      <td><a href="mailto:${m.email}" class="table-url-link">${m.email}</a></td>
      <td>${m.subject}</td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-sm btn-outline-secondary" onclick="openMessageDetail(${m.id})"><i class="fas fa-eye"></i> View</button>
          <button class="btn btn-sm btn-danger" onclick="deleteContactMessage(${m.id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.openMessageDetail = function(id) {
  const m = ADMIN_STATE.contactsData.find(msg => msg.id === id);
  if (!m) return;
  
  document.getElementById('msg-detail-sender').textContent = `${m.name} <${m.email}>`;
  document.getElementById('msg-detail-subject').textContent = m.subject;
  document.getElementById('msg-detail-date').textContent = new Date(m.timestamp).toLocaleString();
  document.getElementById('msg-detail-body').textContent = m.message;
  
  document.getElementById('admin-message-modal').classList.add('active');
};

window.deleteContactMessage = async function(id) {
  if (!confirm('Are you sure you want to delete this message permanently?')) return;
  
  try {
    const res = await fetch(`/api/contact/messages/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ADMIN_STATE.token}` }
    });
    
    if (!res.ok) throw new Error('Failed to delete message');
    
    showToast('Inbox message cleared successfully.', 'info');
    loadInboxMessages();
  } catch (err) {
    showToast(err.message, 'error');
  }
};
