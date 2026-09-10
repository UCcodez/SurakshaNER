-- Physical sensor devices (real or simulated ESP32s)
CREATE TABLE sensors (
  id TEXT PRIMARY KEY,          -- e.g. "esp32-01"
  zone_id TEXT NOT NULL,
  type TEXT NOT NULL,           -- "tilt", "moisture", "vibration"
  status TEXT DEFAULT 'active', -- "active", "offline"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Raw readings streaming in from sensors via MQTT
CREATE TABLE readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sensor_id TEXT NOT NULL,
  value REAL NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sensor_id) REFERENCES sensors(id)
);

-- Geographic zones shown on the map, with live risk score
CREATE TABLE zones (
  id TEXT PRIMARY KEY,          -- e.g. "zone-guwahati-1"
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  risk_score REAL DEFAULT 0,    -- updated by the AI engine
  risk_level TEXT DEFAULT 'low',-- "low", "medium", "high"
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Citizen SOS alerts
CREATE TABLE alerts_sos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'open',   -- "open", "assigned", "resolved"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Announcements from rescue agency (also reused for NGO broadcasts)
CREATE TABLE announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT DEFAULT 'citizens', -- "citizens", "ngo_partners"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Citizen-submitted photo reports tied to a map pin
CREATE TABLE photo_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  photo_url TEXT,
  description TEXT,
  status TEXT DEFAULT 'new',    -- "new", "reviewed"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);