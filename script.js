/* ==========================================================================
   PORTFOLIO STATE & GLOBALS
   ========================================================================== */
const STATE = {
  settings: {},
  skills: [],
  timeline: [],
  projects: [],
  githubRepos: [],
  activeFilters: {
    search: '',
    language: 'all',
    sortBy: 'updated'
  },
  coverSlideInterval: null,
  typedInterval: null,
  searchDebounceTimer: null
};

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Load portfolio database
  loadPortfolioData();
  
  // Track page visit
  trackEvent('visit', 'landing_page');
  
  // Initialize visual enhancements
  initThemeToggle();
  initMouseSpotlight();
  initMagicalRipple();
  initContactForm();
  initPublicAdminLogin();
  
  // Setup click trackers
  initClickTrackers();
});

/* ==========================================================================
   API CONNECTION & LOADING
   ========================================================================== */
async function loadPortfolioData() {
  try {
    const res = await fetch('/api/portfolio');
    if (!res.ok) throw new Error('Failed to load portfolio database');
    const data = await res.json();
    
    STATE.settings = data.settings;
    STATE.skills = data.skills;
    STATE.timeline = data.timeline;
    STATE.projects = data.projects;
    
    // Build UI Components
    updateGeneralSettingsUI();
    renderSkills(STATE.skills);
    renderTimeline(STATE.timeline);
    
    // Initialize hero dynamic typing & slideshows
    initHeroTyping();
    initHeroBgSlideshow();
    
    // Fetch GitHub Repos
    const gitUser = STATE.settings.github_username || 'sumantacollage2004-hub';
    document.getElementById('github-username-input').value = gitUser;
    fetchGitHubRepos(gitUser);
    
  } catch (error) {
    console.error('Error loading portfolio database:', error);
  }
}

// Fetch GitHub Repos using server-side proxy
async function fetchGitHubRepos(username) {
  const syncIcon = document.getElementById('sync-icon');
  const projectsLoading = document.getElementById('projects-loading');
  const projectsGrid = document.getElementById('projects-grid');
  
  if (syncIcon) syncIcon.classList.add('spinning');
  if (projectsLoading) projectsLoading.classList.remove('hidden');
  if (projectsGrid) projectsGrid.classList.add('hidden');
  
  try {
    const res = await fetch(`/api/github/repos/${username}`);
    if (!res.ok) throw new Error(`GitHub integration failed (${res.status})`);
    
    const repos = await res.json();
    STATE.githubRepos = repos.filter(repo => repo.name !== username);
    
    updateStatsCounter();
    populateLanguageFilter();
    applyFiltersAndRenderProjects();
    
  } catch (error) {
    console.error('GitHub API error:', error);
    STATE.githubRepos = [];
    applyFiltersAndRenderProjects();
  } finally {
    if (syncIcon) syncIcon.classList.remove('spinning');
    if (projectsLoading) projectsLoading.classList.add('hidden');
    if (projectsGrid) projectsGrid.classList.remove('hidden');
  }
}

/* ==========================================================================
   ANALYTICS SCRIPT HOOKS
   ========================================================================== */
function trackEvent(type, value) {
  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, value })
  }).catch(e => console.error('Tracking log error:', e));
}

function initClickTrackers() {
  document.querySelectorAll('.track-click').forEach(el => {
    el.addEventListener('click', () => {
      const channel = el.getAttribute('data-channel');
      if (channel) {
        trackEvent('click', channel);
      }
    });
  });
}

/* ==========================================================================
   RENDER FUNCTIONS
   ========================================================================== */
function updateGeneralSettingsUI() {
  const s = STATE.settings;
  
  // Text nodes
  setFieldText('hero-name', s.name || 'Sumanta Sutradhar');
  setFieldText('profile-name', s.name || 'Sumanta Sutradhar');
  setFieldText('profile-bio', s.bio || 'PHP & MySQL Developer');
  setFieldText('profile-loc', s.location || 'West Bengal, India');
  setFieldText('hero-desc', s.detailed_bio || '');
  setFieldText('contact-email', s.email || 'sumantasutradhar52@gmail.com');
  setFieldText('contact-phone', s.phone || '03244247203');
  setFieldText('contact-location', s.location || 'West Bengal, India');
  
  // Social links
  setLinkHref('github-link', `https://github.com/${s.github_username}`);
  setLinkHref('linkedin-link', s.linkedin_url);
  setLinkHref('twitter-link', s.twitter_url);
  setLinkHref('discord-link', s.discord_url);
  
  setLinkHref('email-card-link', `mailto:${s.email}`);
  setLinkHref('phone-card-link', `tel:${s.phone}`);
  
  // Footer social
  const footerGit = document.querySelector('.footer-git');
  if (footerGit) footerGit.href = `https://github.com/${s.github_username}`;
  const footerLi = document.querySelector('.footer-li');
  if (footerLi) footerLi.href = s.linkedin_url || '#';
  const footerTw = document.querySelector('.footer-tw');
  if (footerTw) footerTw.href = s.twitter_url || '#';
  const footerDisc = document.querySelector('.footer-disc');
  if (footerDisc) footerDisc.href = s.discord_url || '#';

  // Profile Image
  const profileImg = document.getElementById('profile-img');
  if (profileImg) {
    profileImg.src = s.avatar_path || '/uploads/avatar_new.jpg';
  }

  // Header Logo
  const navLogoImg = document.getElementById('nav-logo-img');
  if (navLogoImg) {
    navLogoImg.src = s.header_logo_path || '/uploads/header_logo.png';
  }
  
  // Google Map Iframe URL update
  const mapIframe = document.getElementById('map-iframe');
  if (mapIframe && s.map_query) {
    mapIframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(s.map_query)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  }
}

function setFieldText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function setLinkHref(id, url) {
  const el = document.getElementById(id);
  if (el && url) el.href = url;
}

function renderSkills(skills) {
  const grid = document.getElementById('skills-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  const groups = {};
  skills.forEach(s => {
    if (!groups[s.category]) groups[s.category] = [];
    groups[s.category].push(s);
  });
  
  const icons = {
    'Frontend Development': 'fa-laptop-code',
    'Backend & Databases': 'fa-server',
    'DevOps & Workflows': 'fa-tools',
    'Core Competencies': 'fa-users-cog'
  };
  const glowClasses = {
    'Frontend Development': 'cyan-glow',
    'Backend & Databases': 'purple-glow',
    'DevOps & Workflows': 'pink-glow',
    'Core Competencies': 'blue-glow'
  };

  Object.keys(groups).forEach(cat => {
    const card = document.createElement('div');
    card.className = 'skills-card glass-card';
    card.setAttribute('data-reveal', 'bottom');
    
    const icon = icons[cat] || 'fa-code';
    const glow = glowClasses[cat] || 'cyan-glow';
    
    let skillsHTML = '';
    groups[cat].forEach(s => {
      skillsHTML += `
        <div class="skill-item">
          <div class="skill-name">
            <span>${s.name}</span>
            <span>${s.percentage}%</span>
          </div>
          <div class="skill-bar">
            <div class="skill-progress" style="width: ${s.percentage}%;"></div>
          </div>
        </div>
      `;
    });
    
    card.innerHTML = `
      <div class="skills-card-header">
        <div class="skill-card-icon ${glow}"><i class="fas ${icon}"></i></div>
        <h3>${cat}</h3>
      </div>
      <div class="skills-list">
        ${skillsHTML}
      </div>
    `;
    grid.appendChild(card);
  });
  
  initScrollReveal();
}

function renderTimeline(timeline) {
  const container = document.getElementById('timeline-container');
  if (!container) return;
  container.innerHTML = '';
  
  timeline.forEach(item => {
    const div = document.createElement('div');
    div.className = 'timeline-item';
    div.setAttribute('data-reveal', 'bottom');
    
    const logoHTML = item.logo_path 
      ? `<img src="${item.logo_path}" alt="${item.organization}" class="timeline-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="timeline-logo-placeholder" style="display:none;"><i class="fas ${item.type === 'education' ? 'fa-graduation-cap' : 'fa-briefcase'}"></i></div>`
      : `<div class="timeline-logo-placeholder"><i class="fas ${item.type === 'education' ? 'fa-graduation-cap' : 'fa-briefcase'}"></i></div>`;
    
    div.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="timeline-date">${item.date_range}</div>
      <div class="timeline-content glass-card">
        <div class="timeline-header-with-logo">
          <div>
            <h3>${item.title}</h3>
            <h4 class="timeline-org">${item.organization}</h4>
          </div>
          ${logoHTML}
        </div>
        <p>${item.description}</p>
      </div>
    `;
    container.appendChild(div);
  });
  
  initScrollReveal();
}

function updateStatsCounter() {
  const statRepos = document.getElementById('stat-repos');
  const statStars = document.getElementById('stat-stars');
  const statLinkedIn = document.getElementById('stat-linkedin');
  
  let totalStars = STATE.githubRepos.reduce((acc, curr) => acc + (curr.stargazers_count || 0), 0);
  let repoCount = STATE.githubRepos.length;
  
  if (STATE.settings.stat_stars) totalStars = parseInt(STATE.settings.stat_stars);
  if (STATE.settings.stat_repos) repoCount = parseInt(STATE.settings.stat_repos);
  const linkedinFollowers = parseInt(STATE.settings.stat_linkedin_followers || '11500');
  
  animateCounter(statRepos, repoCount);
  animateCounter(statStars, totalStars, false, totalStars > 50);
  animateCounter(statLinkedIn, linkedinFollowers, true);
}

function populateLanguageFilter() {
  const select = document.getElementById('filter-language');
  if (!select) return;
  
  const languages = new Set();
  STATE.githubRepos.forEach(repo => {
    if (repo.language) languages.add(repo.language);
  });
  STATE.projects.forEach(p => {
    if (p.language) languages.add(p.language);
  });
  
  select.innerHTML = '<option value="all">All Languages</option>';
  languages.forEach(lang => {
    const opt = document.createElement('option');
    opt.value = lang;
    opt.textContent = lang;
    select.appendChild(opt);
  });
}

function applyFiltersAndRenderProjects() {
  const { search, language, sortBy } = STATE.activeFilters;
  let allProjects = [];
  
  STATE.projects.forEach(p => {
    allProjects.push({
      id: p.id,
      name: p.name,
      description: p.description,
      language: p.language,
      html_url: p.github_url || '#',
      live_url: p.live_url || '',
      stargazers_count: 5,
      forks_count: 1,
      image_url: p.image_url,
      updated_at: new Date().toISOString(),
      is_custom: true,
      is_featured: p.is_featured === 1
    });
  });
  
  STATE.githubRepos.forEach(repo => {
    allProjects.push({
      name: repo.name,
      description: repo.description,
      language: repo.language,
      html_url: repo.html_url,
      live_url: repo.homepage || '',
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      image_url: '',
      updated_at: repo.updated_at,
      is_custom: false,
      is_featured: false
    });
  });
  
  if (search) {
    allProjects = allProjects.filter(p => 
      p.name.toLowerCase().includes(search) || 
      (p.description && p.description.toLowerCase().includes(search))
    );
  }
  
  if (language !== 'all') {
    allProjects = allProjects.filter(p => p.language === language);
  }
  
  allProjects.sort((a, b) => {
    if (a.is_featured && !b.is_featured) return -1;
    if (!a.is_featured && b.is_featured) return 1;
    
    if (sortBy === 'stars') {
      return b.stargazers_count - a.stargazers_count;
    } else if (sortBy === 'forks') {
      return b.forks_count - a.forks_count;
    } else if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else {
      return new Date(b.updated_at) - new Date(a.updated_at);
    }
  });
  
  renderProjectCards(allProjects);
}

function renderProjectCards(projects) {
  const grid = document.getElementById('projects-grid');
  const emptyState = document.getElementById('projects-empty');
  
  if (!grid) return;
  grid.innerHTML = '';
  
  if (projects.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    grid.classList.add('hidden');
    return;
  }
  
  if (emptyState) emptyState.classList.add('hidden');
  grid.classList.remove('hidden');
  
  const langColors = {
    PHP: '#4F5D95',
    MySQL: '#00758F',
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Python: '#3572A5',
    Vue: '#41b883',
    React: '#61dafb'
  };
  
  projects.forEach(p => {
    const card = document.createElement('div');
    card.className = 'project-card glass-card';
    
    const targetUrl = p.live_url || p.html_url;
    if (targetUrl && targetUrl !== '#') {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if (e.target.closest('.project-link')) return;
        window.open(targetUrl, '_blank');
      });
    }
    
    const langColor = langColors[p.language] || '#2563eb';
    
    let thumbnailHTML = '';
    if (p.image_url) {
      thumbnailHTML = `<img src="${p.image_url}" alt="${p.name}" class="project-thumbnail">`;
    }
    
    let featuredPinHTML = '';
    if (p.is_featured) {
      featuredPinHTML = `<div class="featured-pin">PINNED</div>`;
    }
    
    let linksHTML = `
      <a href="${p.html_url}" class="project-link" target="_blank" title="View Code" aria-label="View Code">
        <i class="fab fa-github"></i>
      </a>
    `;
    if (p.live_url) {
      linksHTML += `
        <a href="${p.live_url}" class="project-link" target="_blank" title="View Live" aria-label="View Live">
          <i class="fas fa-external-link-alt"></i>
        </a>
      `;
    }
    
    card.innerHTML = `
      ${featuredPinHTML}
      ${thumbnailHTML}
      <div class="project-header">
        <i class="far fa-folder"></i>
        <div class="project-links">
          ${linksHTML}
        </div>
      </div>
      <h3>${p.is_custom ? p.name : formatRepoName(p.name)}</h3>
      <p class="project-desc">${p.description || 'No description provided. Click the icon to inspect code.'}</p>
      <div class="project-footer">
        <span class="project-lang">
          <span class="lang-circle" style="background-color: ${langColor}"></span>
          ${p.language || 'Documentation'}
        </span>
        <div class="project-stats">
          <span class="project-stat" title="Stars">
            <i class="fas fa-star"></i> ${p.stargazers_count}
          </span>
          <span class="project-stat" title="Forks">
            <i class="fas fa-code-branch"></i> ${p.forks_count}
          </span>
        </div>
      </div>
    `;
    
    grid.appendChild(card);
  });
}

function formatRepoName(name) {
  return name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/* ==========================================================================
   VISUAL EFFECTS
   ========================================================================== */
function initThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;

  const savedTheme = localStorage.getItem('portfolio_theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    document.documentElement.classList.add('dark-theme');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    document.documentElement.classList.remove('dark-theme');
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }

  themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark-theme');
    const isDark = document.documentElement.classList.contains('dark-theme');
    localStorage.setItem('portfolio_theme', isDark ? 'dark' : 'light');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  });
}

function initMouseSpotlight() {
  const mouseGlow = document.getElementById('mouse-glow');
  if (!mouseGlow) return;

  window.addEventListener('mousemove', (e) => {
    mouseGlow.style.left = `${e.clientX}px`;
    mouseGlow.style.top = `${e.clientY}px`;
  });
}

function initMagicalRipple() {
  window.addEventListener('click', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA' || e.target.closest('iframe')) {
      return;
    }
    const ripple = document.createElement('div');
    ripple.className = 'magical-ripple';
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 800);
  });
}

function initHeroTyping() {
  const typedTextSpan = document.getElementById('typed-text');
  if (!typedTextSpan) return;

  const defaultPhrases = [
    'PHP & MySQL Web Applications', 
    'Database Architectures', 
    'CodeAlpha Frontend layouts', 
    'Secure Server API Handlers'
  ];
  
  let phrases = defaultPhrases;
  if (STATE.settings.bio) {
    phrases = [
      `${STATE.settings.bio} Web Applications`,
      'Optimized Relational Databases',
      'Interactive Front-End Components',
      'Secure Server-Side APIs'
    ];
  }
  
  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typingSpeed = 100;

  if (STATE.typedInterval) clearTimeout(STATE.typedInterval);

  function type() {
    const currentPhrase = phrases[phraseIndex];
    if (isDeleting) {
      typedTextSpan.textContent = currentPhrase.substring(0, charIndex - 1);
      charIndex--;
      typingSpeed = 50;
    } else {
      typedTextSpan.textContent = currentPhrase.substring(0, charIndex + 1);
      charIndex++;
      typingSpeed = 100;
    }

    if (!isDeleting && charIndex === currentPhrase.length) {
      isDeleting = true;
      typingSpeed = 2000;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      typingSpeed = 500;
    }
    STATE.typedInterval = setTimeout(type, typingSpeed);
  }
  type();
}

function initHeroBgSlideshow() {
  const slider = document.getElementById('hero-bg-slider');
  if (!slider) return;

  let covers = [];
  try {
    covers = STATE.settings.cover_paths || ['/uploads/project1.png'];
  } catch (e) {
    covers = ['/uploads/project1.png'];
  }

  slider.innerHTML = '';
  covers.forEach((cover, idx) => {
    const div = document.createElement('div');
    div.className = `hero-bg-slide ${idx === 0 ? 'active' : ''}`;
    div.style.backgroundImage = `url('${cover}')`;
    slider.appendChild(div);
  });
  slider.appendChild(Object.assign(document.createElement('div'), {className: 'hero-bg-overlay'}));

  const slides = slider.querySelectorAll('.hero-bg-slide');
  if (slides.length <= 1) return;

  let currentIndex = 0;
  if (STATE.coverSlideInterval) clearInterval(STATE.coverSlideInterval);
  STATE.coverSlideInterval = setInterval(() => {
    slides[currentIndex].classList.remove('active');
    currentIndex = (currentIndex + 1) % slides.length;
    slides[currentIndex].classList.add('active');
  }, 4000);
}

function animateCounter(element, targetValue, isFormatted = false, hasPlusLimit = false) {
  if (!element) return;
  let currentValue = 0;
  const duration = 1200;
  const stepTime = 30;
  
  element.textContent = '0';
  if (targetValue === 0) return;

  const steps = duration / stepTime;
  const increment = targetValue / steps;
  let stepCount = 0;

  const timer = setInterval(() => {
    currentValue += increment;
    stepCount++;
    
    if (stepCount >= steps || currentValue >= targetValue) {
      if (isFormatted) {
        element.textContent = (targetValue / 1000).toFixed(1) + 'K+';
      } else if (hasPlusLimit) {
        element.textContent = targetValue + '+';
      } else {
        element.textContent = Math.round(targetValue);
      }
      clearInterval(timer);
    } else {
      if (isFormatted) {
        element.textContent = (currentValue / 1000).toFixed(1) + 'K+';
      } else {
        element.textContent = Math.round(currentValue);
      }
    }
  }, stepTime);
}

function initScrollReveal() {
  const revealElements = document.querySelectorAll('[data-reveal]');
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.05,
    rootMargin: '0px 0px -40px 0px'
  });
  revealElements.forEach(el => revealObserver.observe(el));
}

// Navbar operations
const navbar = document.querySelector('.navbar');
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
  
  let currentSectionId = '';
  const sections = document.querySelectorAll('section');
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 120;
    const sectionHeight = section.clientHeight;
    if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
      currentSectionId = section.getAttribute('id');
    }
  });

  if (currentSectionId) {
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSectionId}`) {
        link.classList.add('active');
      }
    });
  }
});

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    const icon = navToggle.querySelector('i');
    icon.className = navMenu.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
  });
}
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (navMenu) navMenu.classList.remove('active');
    if (navToggle) navToggle.querySelector('i').className = 'fas fa-bars';
  });
});

function initContactForm() {
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('form-name').value.trim();
    const email = document.getElementById('form-email').value.trim();
    const subject = document.getElementById('form-subject').value.trim();
    const message = document.getElementById('form-message').value.trim();

    if (!name || !email || !subject || !message) {
      status.className = 'form-status error';
      status.style.display = 'block';
      status.textContent = 'Please complete all fields.';
      return;
    }

    status.className = 'form-status info';
    status.style.display = 'block';
    status.textContent = 'Sending message...';

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error occurred');
      
      status.className = 'form-status success';
      status.textContent = data.message;
      form.reset();
      setTimeout(() => status.style.display = 'none', 6000);

    } catch (err) {
      status.className = 'form-status error';
      status.textContent = err.message;
    }
  });
}

// Debounced Search query analytics tracking
document.getElementById('project-search')?.addEventListener('input', (e) => {
  const query = e.target.value.trim().toLowerCase();
  STATE.activeFilters.search = query;
  applyFiltersAndRenderProjects();
  
  if (query.length > 2) {
    if (STATE.searchDebounceTimer) clearTimeout(STATE.searchDebounceTimer);
    STATE.searchDebounceTimer = setTimeout(() => {
      trackEvent('search', query);
    }, 1000); // Wait 1 second after user stops typing to track search term
  }
});

document.getElementById('filter-language')?.addEventListener('change', (e) => {
  STATE.activeFilters.language = e.target.value;
  applyFiltersAndRenderProjects();
});

document.getElementById('sort-projects')?.addEventListener('change', (e) => {
  STATE.activeFilters.sortBy = e.target.value;
  applyFiltersAndRenderProjects();
});

function initPublicAdminLogin() {
  const form = document.getElementById('public-admin-login-form');
  const status = document.getElementById('gate-login-status');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('gate-passcode').value;
    
    status.className = 'gate-status';
    status.style.display = 'none';
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Incorrect passcode');
      
      // Store token
      localStorage.setItem('portfolio_admin_token', data.token);
      
      status.className = 'gate-status success';
      status.style.display = 'block';
      status.textContent = 'Passcode authorized! Redirecting to dashboard...';
      
      // Redirect to admin panel after 1 second
      setTimeout(() => {
        window.location.href = '/admin';
      }, 1000);

    } catch (err) {
      status.className = 'gate-status error';
      status.style.display = 'block';
      status.textContent = err.message;
      
      // Shake the card slightly for visual feedback
      const card = form.closest('.gate-card');
      if (card) {
        card.classList.add('shake-effect');
        setTimeout(() => card.classList.remove('shake-effect'), 500);
      }
    }
  });
}
