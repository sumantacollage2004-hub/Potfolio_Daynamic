const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'portfolio.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    // 1. Settings table (key-value)
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT
    )`);

    // 2. Skills table
    db.run(`CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT,
      name TEXT,
      percentage INTEGER
    )`);

    // 3. Timeline table (Education & Experience)
    db.run(`CREATE TABLE IF NOT EXISTS timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT, -- 'experience' or 'education'
      date_range TEXT,
      title TEXT,
      organization TEXT,
      description TEXT,
      logo_path TEXT
    )`);

    // 4. Projects table (Custom local projects)
    db.run(`CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      language TEXT,
      github_url TEXT,
      live_url TEXT,
      image_url TEXT,
      is_featured INTEGER DEFAULT 0
    )`);

    // 5. Analytics table
    db.run(`CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT, -- 'visit', 'search', 'click'
      event_value TEXT, -- term searched, link clicked, page section
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 6. Contacts table (Inbox Messages)
    db.run(`CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      subject TEXT,
      message TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed data if database is fresh
    seedData();

    // Force-ensure github_username is exactly sumantacollage2004-hub
    db.run("INSERT OR REPLACE INTO settings (setting_key, setting_value) VALUES ('github_username', 'sumantacollage2004-hub')");

    // Force-ensure header_logo_path defaults to /uploads/header_logo.png if not exists
    db.run("INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES ('header_logo_path', '/uploads/header_logo.png')");
  });
}

function seedData() {
  db.get("SELECT COUNT(*) as count FROM settings", (err, row) => {
    if (err) return console.error('Error checking settings table:', err);
    
    if (row.count === 0) {
      console.log('Database empty. Seeding initial portfolio content...');

      // Seed settings
      const defaultSettings = [
        ['name', 'Sumanta Sutradhar'],
        ['bio', 'Website Developer'],
        ['detailed_bio', 'Specialized developer focusing on database systems, backend architecture, and dynamic web applications. Expert in creating secure web panels and managing server-side operations with PHP & MySQL.'],
        ['location', 'West Bengal, India'],
        ['email', 'sumantasutradhar52@gmail.com'],
        ['phone', '03244247203'],
        ['map_query', 'Ashurali, Joypur, Bankura, West Bengal, India'],
        ['github_username', 'sumantacollage2004-hub'],
        ['linkedin_url', 'https://www.linkedin.com/in/sumanta-sutradhar/'],
        ['twitter_url', 'https://x.com/SumantaSutradh7'],
        ['discord_url', 'https://discord.gg/5cczRf2B'],
        ['avatar_path', '/uploads/avatar_new.jpg'],
        ['header_logo_path', '/uploads/header_logo.png'],
        ['cover_paths', JSON.stringify([
          '/uploads/project1.png',
          '/uploads/project2.png',
          '/uploads/project3.png',
          '/uploads/project4.png'
        ])],
        ['admin_password', 'admin123'],
        ['stat_linkedin_followers', '11500'],
        ['stat_stars', '99'],
        ['stat_repos', '88']
      ];

      const stmtSetting = db.prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)");
      defaultSettings.forEach(s => stmtSetting.run(s));
      stmtSetting.finalize();

      // Seed Skills
      const defaultSkills = [
        ['Frontend Development', 'HTML5 / CSS3', 95],
        ['Frontend Development', 'JavaScript (ES6+)', 90],
        ['Frontend Development', 'React / Next.js', 80],
        ['Frontend Development', 'TailwindCSS', 85],
        
        ['Backend & Databases', 'PHP / OOP PHP', 95],
        ['Backend & Databases', 'MySQL / SQL Queries', 92],
        ['Backend & Databases', 'Node.js / Express', 78],
        ['Backend & Databases', 'RESTful APIs & JSON', 88],

        ['DevOps & Workflows', 'Git / GitHub', 92],
        ['DevOps & Workflows', 'Docker / Containerization', 70],
        ['DevOps & Workflows', 'CI/CD Pipelines', 72],
        ['DevOps & Workflows', 'Figma / UI Design', 85],

        ['Core Competencies', 'Problem Solving (DSA)', 88],
        ['Core Competencies', 'Team Leadership', 80],
        ['Core Competencies', 'Agile Methodologies', 85],
        ['Core Competencies', 'Communication', 90]
      ];

      const stmtSkill = db.prepare("INSERT INTO skills (category, name, percentage) VALUES (?, ?, ?)");
      defaultSkills.forEach(s => stmtSkill.run(s));
      stmtSkill.finalize();

      // Seed Timeline
      const defaultTimeline = [
        [
          'experience', 
          '2026 - Present', 
          'Frontend Developer', 
          'CodeAlpha', 
          'Developing interactive user interfaces and frontend web components using modern HTML, CSS, and JavaScript layouts. Worked on implementing responsive designs and enhancing UI/UX interactions.',
          '/uploads/logo_codealpha.png'
        ],
        [
          'experience', 
          '2025 - 2026', 
          'PHP & MySQL Developer', 
          'Euphoria GenX', 
          'Developing database architectures and server-side components using OOP PHP and MySQL. Designed robust back-office portals, optimized slow database queries, integrated payment APIs, and ensured high runtime security compliance.',
          '/uploads/logo_euphoria.png'
        ],
        [
          'experience', 
          '2023 - 2025', 
          'Backend Web Engineer', 
          'Innovation Labs', 
          'Implemented backends using JavaScript, Node.js, and Express. Maintained RESTful APIs, managed relational database schemas, and streamlined containerized workflows using Docker and Git.',
          ''
        ],
        [
          'education', 
          '2022 - 2025', 
          'BCA (Bachelor of Computer Applications)', 
          'The University of Burdwan', 
          'Completed professional training in computational foundations, databases, system designs, computer architectures, web programming, and algorithms. Graduated with honors.',
          '/uploads/logo_burdwan.png'
        ]
      ];

      const stmtTimeline = db.prepare(`INSERT INTO timeline 
        (type, date_range, title, organization, description, logo_path) 
        VALUES (?, ?, ?, ?, ?, ?)`);
      defaultTimeline.forEach(t => stmtTimeline.run(t));
      stmtTimeline.finalize();

      // Seed Projects
      const defaultProjects = [
        [
          'PHP MySQL Inventory System',
          'A robust inventory management system built with object-oriented PHP and MySQL. Includes role-based auth, dynamic reporting charts, and PDF invoicing exports.',
          'PHP',
          'https://github.com/sumantacollage2004-hub',
          '',
          '/uploads/project1.png',
          1
        ],
        [
          'Euphoria GenX Portal',
          'Web administration panel designed for Euphoria GenX trainees. Features batch management, course tracking dashboards, and automated database syncs.',
          'PHP',
          'https://github.com/sumantacollage2004-hub',
          '',
          '/uploads/project2.png',
          1
        ],
        [
          'Glassmorphism Dashboard UI',
          'A premium, modern glassmorphic dashboard built using pure HTML, CSS, and JS. Designed for visual excellence, micro-animations, and full desktop/mobile responsiveness.',
          'CSS',
          'https://github.com/sumantacollage2004-hub/CodeAlpha_Mini-Project-Prototype-Design',
          'https://sumantacollage2004-hub.github.io/Portfolio-/',
          '/uploads/project3.png',
          1
        ]
      ];

      const stmtProject = db.prepare(`INSERT INTO projects 
        (name, description, language, github_url, live_url, image_url, is_featured) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`);
      defaultProjects.forEach(p => stmtProject.run(p));
      stmtProject.finalize();

      // Seed Mock Analytics Data
      const defaultAnalytics = [
        ['visit', 'landing_page'],
        ['visit', 'landing_page'],
        ['visit', 'landing_page'],
        ['visit', 'landing_page'],
        ['visit', 'landing_page'],
        ['click', 'LinkedIn'],
        ['click', 'LinkedIn'],
        ['click', 'GitHub'],
        ['click', 'Twitter'],
        ['search', 'PHP'],
        ['search', 'PHP'],
        ['search', 'React'],
        ['search', 'database'],
        ['search', 'MySQL']
      ];
      
      const stmtAnalytics = db.prepare("INSERT INTO analytics (event_type, event_value) VALUES (?, ?)");
      defaultAnalytics.forEach(a => stmtAnalytics.run(a));
      stmtAnalytics.finalize();

      // Seed Mock Contact Messages
      const defaultContacts = [
        ['Rohan Sharma', 'rohan@example.com', 'Business Opportunity', 'Hi Sumanta, I saw your dynamic portfolio and I would love to build a custom backend inventory panel for my store. Please call me!'],
        ['Ananya Sen', 'ananya@gmail.com', 'Frontend Consultation', 'Hello Sumanta! Can we connect over LinkedIn? I have a frontend layout gig using next.js. Thanks!']
      ];
      const stmtContact = db.prepare("INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)");
      defaultContacts.forEach(c => stmtContact.run(c));
      stmtContact.finalize();
      
      console.log('Database seeded successfully.');
    }
  });
}

module.exports = {
  db,
  
  // Settings API helpers
  getSettings: (cb) => {
    db.all("SELECT * FROM settings", (err, rows) => {
      if (err) return cb(err);
      const settingsObj = {};
      rows.forEach(r => {
        if (r.setting_key === 'cover_paths') {
          try {
            settingsObj[r.setting_key] = JSON.parse(r.setting_value);
          } catch(e) {
            settingsObj[r.setting_key] = [];
          }
        } else {
          settingsObj[r.setting_key] = r.setting_value;
        }
      });
      cb(null, settingsObj);
    });
  },
  updateSetting: (key, val, cb) => {
    db.run("INSERT OR REPLACE INTO settings (setting_key, setting_value) VALUES (?, ?)", [key, val], cb);
  },
  
  // Skills API helpers
  getSkills: (cb) => {
    db.all("SELECT * FROM skills", cb);
  },
  saveSkills: (skillsArray, cb) => {
    db.serialize(() => {
      db.run("DELETE FROM skills", (err) => {
        if (err) return cb(err);
        if (skillsArray.length === 0) return cb(null);
        const stmt = db.prepare("INSERT INTO skills (category, name, percentage) VALUES (?, ?, ?)");
        skillsArray.forEach(s => {
          stmt.run([s.category, s.name, parseInt(s.percentage)]);
        });
        stmt.finalize(cb);
      });
    });
  },

  // Timeline API helpers
  getTimeline: (cb) => {
    db.all("SELECT * FROM timeline ORDER BY id ASC", cb);
  },
  addTimelineItem: (item, cb) => {
    db.run(`INSERT INTO timeline (type, date_range, title, organization, description, logo_path)
            VALUES (?, ?, ?, ?, ?, ?)`, 
            [item.type, item.date_range, item.title, item.organization, item.description, item.logo_path || ''], 
            function(err) { cb(err, this ? this.lastID : null); });
  },
  updateTimelineItem: (id, item, cb) => {
    db.run(`UPDATE timeline SET type = ?, date_range = ?, title = ?, organization = ?, description = ?, logo_path = ?
            WHERE id = ?`,
            [item.type, item.date_range, item.title, item.organization, item.description, item.logo_path || '', id],
            cb);
  },
  deleteTimelineItem: (id, cb) => {
    db.run("DELETE FROM timeline WHERE id = ?", [id], cb);
  },

  // Projects API helpers
  getProjects: (cb) => {
    db.all("SELECT * FROM projects ORDER BY is_featured DESC, id DESC", cb);
  },
  addProject: (p, cb) => {
    db.run(`INSERT INTO projects (name, description, language, github_url, live_url, image_url, is_featured)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [p.name, p.description, p.language, p.github_url, p.live_url, p.image_url || '', p.is_featured || 0],
            function(err) { cb(err, this ? this.lastID : null); });
  },
  updateProject: (id, p, cb) => {
    db.run(`UPDATE projects SET name = ?, description = ?, language = ?, github_url = ?, live_url = ?, image_url = ?, is_featured = ?
            WHERE id = ?`,
            [p.name, p.description, p.language, p.github_url, p.live_url, p.image_url || '', p.is_featured || 0, id],
            cb);
  },
  deleteProject: (id, cb) => {
    db.run("DELETE FROM projects WHERE id = ?", [id], cb);
  },

  // Analytics API helpers
  logEvent: (type, val, cb) => {
    db.run("INSERT INTO analytics (event_type, event_value) VALUES (?, ?)", [type, val], cb);
  },
  getMetrics: (cb) => {
    const metrics = {
      total_visits: 0,
      total_reach: 0,
      searches: [],
      clicks: []
    };

    // Run parallel queries to compile metrics
    db.get("SELECT COUNT(*) as count FROM analytics WHERE event_type = 'visit'", (err, row) => {
      if (err) return cb(err);
      metrics.total_visits = row ? row.count : 0;

      db.get("SELECT COUNT(*) as count FROM analytics WHERE event_type = 'click'", (err, row) => {
        if (err) return cb(err);
        metrics.total_reach = (row ? row.count : 0) + metrics.total_visits; // Reach = Visits + Clicks

        db.all(`SELECT event_value as term, COUNT(*) as count, MAX(timestamp) as last_searched 
                FROM analytics WHERE event_type = 'search' 
                GROUP BY event_value 
                ORDER BY count DESC, last_searched DESC LIMIT 10`, (err, rows) => {
          if (err) return cb(err);
          metrics.searches = rows || [];

          db.all(`SELECT event_value as channel, COUNT(*) as count 
                  FROM analytics WHERE event_type = 'click' 
                  GROUP BY event_value 
                  ORDER BY count DESC`, (err, rows) => {
            if (err) return cb(err);
            metrics.clicks = rows || [];
            cb(null, metrics);
          });
        });
      });
    });
  },

  // Contact Form Message helpers
  saveContactMessage: (msg, cb) => {
    db.run("INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)",
            [msg.name, msg.email, msg.subject, msg.message], cb);
  },
  getContactMessages: (cb) => {
    db.all("SELECT * FROM contacts ORDER BY timestamp DESC", cb);
  },
  deleteContactMessage: (id, cb) => {
    db.run("DELETE FROM contacts WHERE id = ?", [id], cb);
  }
};
