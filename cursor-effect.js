document.addEventListener('DOMContentLoaded', () => {
  initCursorParticles();
});

function initCursorParticles() {
  if (window.innerWidth < 768) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'cursor-particles-canvas';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let particles = [];
  let hue = 0;
  let cursorHueOverride = null;
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // Color text/touch detector for custom particle trail (Index and Admin selectors)
  window.addEventListener('mouseover', (e) => {
    const target = e.target.closest('a, button, .text-glow, .social-icon, .hero-badge, .timeline-date, .contact-card-icon, .gate-icon-wrap, .timeline-logo-placeholder, .pulse-dot, .nav-tab-btn, .badge, .status-indicator');
    if (target) {
      if (target.classList.contains('text-glow') || target.closest('.nav-logo') || target.classList.contains('active') || target.closest('#theme-toggle') || target.closest('.sidebar-header')) {
        cursorHueOverride = 190; // Cyan/blue
      } else if (target.classList.contains('btn-primary') || target.classList.contains('footer-git') || target.closest('.gate-card-glow')) {
        cursorHueOverride = 270; // Cyan-purple
      } else if (target.classList.contains('social-icon') || target.closest('.timeline-date') || target.classList.contains('table-url-link') || target.classList.contains('nav-tab-btn')) {
        cursorHueOverride = 210; // Softer Blue
      } else if (target.classList.contains('btn-danger') || target.closest('.timeline-logo-placeholder')) {
        cursorHueOverride = 345; // Soft red/pink
      } else {
        cursorHueOverride = null;
      }
    } else {
      cursorHueOverride = null;
    }
  });

  window.addEventListener('mouseout', () => {
    cursorHueOverride = null;
  });
  
  window.addEventListener('mousemove', (e) => {
    const currentHue = (cursorHueOverride !== null) ? cursorHueOverride : hue;
    for (let i = 0; i < 2; i++) {
      particles.push({
        x: e.clientX,
        y: e.clientY + window.scrollY,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5 - 0.3,
        size: Math.random() * 6 + 4,
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015,
        color: currentHue,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15
      });
    }
    if (cursorHueOverride === null) {
      hue = (hue + 4) % 360;
    }
  });
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, index) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      p.angle += p.rotationSpeed;
      
      ctx.save();
      ctx.translate(p.x, p.y - window.scrollY);
      ctx.rotate(p.angle);
      ctx.fillStyle = `hsla(${p.color}, 90%, 55%, ${p.alpha})`;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
      
      if (p.alpha <= 0) {
        particles.splice(index, 1);
      }
    });
    
    requestAnimationFrame(animate);
  }
  
  animate();
}
