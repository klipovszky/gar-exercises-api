DROP TABLE IF EXISTS exercises;
CREATE TABLE exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  category_garmin TEXT,
  name_garmin TEXT,
  found BOOLEAN,
  url TEXT
);

DROP TABLE IF EXISTS muscle_groups;
CREATE TABLE muscle_groups (
  exercise_id INTEGER,
  muscle TEXT,
  FOREIGN KEY(exercise_id) REFERENCES exercises(id)
);

DROP TABLE IF EXISTS equipment;
CREATE TABLE equipment (
  exercise_id INTEGER,
  tool TEXT,
  FOREIGN KEY(exercise_id) REFERENCES exercises(id)
);
