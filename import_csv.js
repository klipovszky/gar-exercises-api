const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const { parse } = require("csv-parse/sync");
const path = require("path");
const fetch = require("node-fetch");

const sources = [
  {
    url: "https://raw.githubusercontent.com/klipovszky/gar-excercise/main/Garmin%20Exercises%20Database%20-%20Exercises.csv",
    type: "exercise",
  },
  {
    url: "https://raw.githubusercontent.com/klipovszky/gar-excercise/main/Garmin%20Exercises%20Database%20-%20Yoga.csv",
    type: "yoga",
  },
  {
    url: "https://raw.githubusercontent.com/klipovszky/gar-excercise/main/Garmin%20Exercises%20Database%20-%20Pilates.csv",
    type: "pilates",
  },
  {
    url: "https://raw.githubusercontent.com/klipovszky/gar-excercise/main/Garmin%20Exercises%20Database%20-%20Mobility.csv",
    type: "mobility",
  },
];

async function downloadCSV(url, dest) {
  const res = await fetch(url);
  const data = await res.text();
  fs.writeFileSync(dest, data, "utf8");
}

async function run() {
  const db = new sqlite3.Database("exercises.db");
  db.serialize(() => {
    const schemaPath = path.join(__dirname, "schema.sql");
    db.exec(fs.readFileSync(schemaPath, "utf8"));
  });

  for (const { url, type } of sources) {
    const fileName = `tmp-${type}.csv`;
    console.log(`⬇️ Letöltés: ${type}...`);
    await downloadCSV(url, fileName);

    const raw = fs.readFileSync(fileName, "utf8");
    const rows = parse(raw, { skip_empty_lines: true });
    const headers = rows[0];
    const dataRows = rows.slice(1);

    const muscleCols = headers.map((h, i) => h.includes("MUSCLE") ? i : -1).filter(i => i >= 0);
    const equipmentCols = headers.map((h, i) => h.includes("EQUIPMENT") ? i : -1).filter(i => i >= 0);

    const db = new sqlite3.Database("exercises.db");

    const stmt = db.prepare(`
      INSERT INTO exercises (name, category_garmin, name_garmin, difficulty, found, url, type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const muscleStmt = db.prepare(`INSERT INTO muscle_groups (exercise_id, muscle) VALUES (?, ?)`);
    const equipmentStmt = db.prepare(`INSERT INTO equipment (exercise_id, tool) VALUES (?, ?)`);

    for (const row of dataRows) {
      const [name, category, nameGarmin, difficulty, foundRaw, urlRaw, ...rest] = row;
      if (!name) continue;

      const url = urlRaw || null;
      const found = (foundRaw || "").toString().trim().toLowerCase() === "true";

      await new Promise((resolve) => {
        db.get(`SELECT id FROM exercises WHERE name_garmin = ? OR url = ?`, [nameGarmin, url], (err, existing) => {
          if (err) {
            console.error("❌ DB error:", err.message);
            return resolve();
          }

          if (existing) {
            console.log(`⏩ Skip dupe: ${name}`);
            return resolve();
          }

          stmt.run(name, category, nameGarmin, difficulty, found, url, type, function () {
            const id = this.lastID;

            muscleCols.forEach(i => {
              if ((row[i] || "").toLowerCase() === "true") {
                muscleStmt.run(id, headers[i]);
              }
            });

            equipmentCols.forEach(i => {
              if ((row[i] || "").toLowerCase() === "true") {
                equipmentStmt.run(id, headers[i]);
              }
            });

            resolve();
          });
        });
      });
    }

    stmt.finalize();
    muscleStmt.finalize();
    equipmentStmt.finalize();

    db.close();
    console.log(`✅ Import kész: ${type}`);
  }

  console.log("🎉 Minden adat betöltve!");
}

run();
