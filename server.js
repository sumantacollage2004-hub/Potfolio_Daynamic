const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const dbHelper = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and parsing of JSON/url-encoded bodies
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve public directory as static files
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter (accept images only)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

/* ==========================================================================
   CLEAN ROUTING FOR ADMIN PANEL
   ========================================================================== */
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

/* ==========================================================================
   PORTFOLIO RETRIEVAL API
   ========================================================================== */
app.get('/api/portfolio', (req, res) => {
  dbHelper.getSettings((err, settings) => {
    if (err) return res.status(500).json({ error: err.message });
    
    dbHelper.getSkills((err, skills) => {
      if (err) return res.status(500).json({ error: err.message });
      
      dbHelper.getTimeline((err, timeline) => {
        if (err) return res.status(500).json({ error: err.message });
        
        dbHelper.getProjects((err, projects) => {
          if (err) return res.status(500).json({ error: err.message });
          
          res.json({
            settings,
            skills,
            timeline,
            projects
          });
        });
      });
    });
  });
});

/* ==========================================================================
   AUTHENTICATION API
   ========================================================================== */
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  
  dbHelper.db.get("SELECT setting_value FROM settings WHERE setting_key = 'admin_password'", (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const dbPassword = row ? row.setting_value : 'admin123';
    if (password === dbPassword) {
      const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
      res.json({ success: true, token });
    } else {
      res.status(401).json({ success: false, error: 'Invalid admin passcode' });
    }
  });
});

// Middleware to protect admin routes
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = Buffer.from(token, 'base64').toString('ascii');
      if (decoded.startsWith('admin:')) {
        return next();
      }
    } catch(e) {}
  }
  res.status(403).json({ error: 'Unauthorized admin action' });
}

/* ==========================================================================
   ANALYTICS SYSTEM ENDPOINTS
   ========================================================================== */
app.post('/api/analytics/event', (req, res) => {
  const { type, value } = req.body;
  if (!type || !value) {
    return res.status(400).json({ error: 'Event type and value are required' });
  }
  dbHelper.logEvent(type, value, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/analytics/metrics', requireAuth, (req, res) => {
  dbHelper.getMetrics((err, metrics) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(metrics);
  });
});

/* ==========================================================================
   SETTINGS EDIT API
   ========================================================================== */
app.post('/api/portfolio/settings', requireAuth, (req, res) => {
  const updates = req.body;
  
  dbHelper.db.serialize(() => {
    let hasError = false;
    const stmt = dbHelper.db.prepare("INSERT OR REPLACE INTO settings (setting_key, setting_value) VALUES (?, ?)");
    
    Object.keys(updates).forEach(key => {
      let val = updates[key];
      if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      stmt.run(key, String(val), (err) => {
        if (err) {
          console.error(`Error saving setting ${key}:`, err);
          hasError = true;
        }
      });
    });
    
    stmt.finalize((err) => {
      if (err || hasError) {
        return res.status(500).json({ error: 'Failed to update some settings' });
      }
      res.json({ success: true });
    });
  });
});

/* ==========================================================================
   SKILLS BATCH API
   ========================================================================== */
app.post('/api/skills', requireAuth, (req, res) => {
  const { skills } = req.body;
  if (!Array.isArray(skills)) {
    return res.status(400).json({ error: 'Skills must be an array' });
  }
  
  dbHelper.saveSkills(skills, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

/* ==========================================================================
   TIMELINE CRUD API
   ========================================================================== */
app.post('/api/timeline', requireAuth, (req, res) => {
  const item = req.body;
  dbHelper.addTimelineItem(item, (err, insertId) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: insertId });
  });
});

app.put('/api/timeline/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const item = req.body;
  dbHelper.updateTimelineItem(id, item, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/timeline/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  dbHelper.deleteTimelineItem(id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

/* ==========================================================================
   PROJECTS CRUD API
   ========================================================================== */
app.post('/api/projects', requireAuth, (req, res) => {
  const project = req.body;
  dbHelper.addProject(project, (err, insertId) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: insertId });
  });
});

app.put('/api/projects/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const project = req.body;
  dbHelper.updateProject(id, project, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/projects/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  dbHelper.deleteProject(id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

/* ==========================================================================
   CONTACT FORM CRM INBOX ENDPOINTS
   ========================================================================== */
app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields (name, email, subject, message) are required' });
  }
  
  dbHelper.saveContactMessage({ name, email, subject, message }, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Your message has been received! Sumanta will get back to you shortly.' });
  });
});

app.get('/api/contact/messages', requireAuth, (req, res) => {
  dbHelper.getContactMessages((err, messages) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(messages);
  });
});

app.delete('/api/contact/messages/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  dbHelper.deleteContactMessage(id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

/* ==========================================================================
   IMAGE UPLOAD API
   ========================================================================== */
app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  const relativeUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: relativeUrl });
});

/* ==========================================================================
   GITHUB PROXY SERVICE
   ========================================================================== */
app.get('/api/github/repos/:username', (req, res) => {
  const { username } = req.params;
  
  const options = {
    hostname: 'api.github.com',
    port: 443,
    path: `/users/${username}/repos?per_page=100&sort=updated`,
    method: 'GET',
    headers: {
      'User-Agent': 'node.js-proxy'
    }
  };

  const githubReq = https.get(options, (githubRes) => {
    let data = '';
    
    githubRes.on('data', (chunk) => {
      data += chunk;
    });
    
    githubRes.on('end', () => {
      try {
        if (githubRes.statusCode === 200) {
          const repos = JSON.parse(data);
          res.json(repos);
        } else {
          res.status(githubRes.statusCode).json({ error: `GitHub API returned status ${githubRes.statusCode}` });
        }
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse GitHub response' });
      }
    });
  });

  githubReq.on('error', (err) => {
    console.error('GitHub proxy error:', err);
    res.status(500).json({ error: 'Failed to fetch repositories from GitHub' });
  });
});

/* ==========================================================================
   START SERVER
   ========================================================================== */
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  Sumanta Sutradhar Dynamic Portfolio Running!    `);
  console.log(`  URL: http://localhost:${PORT}                   `);
  console.log(`  Admin passcode: admin123                        `);
  console.log(`==================================================`);
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});