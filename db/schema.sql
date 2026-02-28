DROP TABLE IF EXISTS claims;
DROP TABLE IF EXISTS items;

-- items table
CREATE TABLE items (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(255)  NOT NULL,
  description     TEXT          NOT NULL,
  category        VARCHAR(100)  NOT NULL,
  location_found  VARCHAR(255)  NOT NULL,
  date_found      DATE          NOT NULL,
  photo_path      VARCHAR(500),           -- relative path like "uploads/abc.jpg"
  finder_name     VARCHAR(255),
  finder_email    VARCHAR(255),
  status          VARCHAR(50)   NOT NULL DEFAULT 'pending',  -- pending | approved | claimed | rejected
  created_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- claims table
CREATE TABLE claims (
  id                    SERIAL PRIMARY KEY,
  item_id               INTEGER       NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  claimant_name         VARCHAR(255)  NOT NULL,
  claimant_email        VARCHAR(255)  NOT NULL,
  extra_notes           TEXT,
  verification_question TEXT,           
  verification_answer   TEXT,           
  status                VARCHAR(50)   NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  created_at            TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- indexes for the queries we run most often
CREATE INDEX idx_items_status     ON items(status);
CREATE INDEX idx_items_category   ON items(category);
CREATE INDEX idx_items_created_at ON items(created_at DESC);
CREATE INDEX idx_claims_item_id   ON claims(item_id);
CREATE INDEX idx_claims_status    ON claims(status);

-- some seed data so the site isn't empty on first run
INSERT INTO items (title, description, category, location_found, date_found, status) VALUES
  ('White AirPods Case',        'Found near table 7 in the cafeteria. Has a small scratch on the lid. No AirPods inside.',              'Electronics', 'Cafeteria, Table 7',        '2025-01-14', 'approved'),
  ('Navy Blue Hoodie',          'Large navy hoodie left in the gym bleachers after Friday''s assembly. No name tag inside.',             'Clothing',    'Gym bleachers',             '2025-01-15', 'approved'),
  ('Hydro Flask, Black 32oz',   'Black Hydro Flask found under a desk in Room 204. Has stickers on the outside.',                       'Other',       'Room 204',                  '2025-01-15', 'approved'),
  ('Gray JanSport Backpack',    'Gray JanSport found in hallway B near the lockers. Contains some notebooks and a pencil case.',        'Bags',        'Hallway B, near lockers',   '2025-01-16', 'approved'),
  ('TI-84 Graphing Calculator', 'TI-84 Plus found on a desk in the math wing. Has initials written in marker on the back.',            'Stationery',  'Math wing, Room 312',       '2025-01-17', 'approved'),
  ('iPhone, Cracked Screen',    'Black iPhone found on a library table. Screen is cracked in the top-right corner. Passcode locked.',  'Electronics', 'Library, window table',     '2025-01-17', 'pending');