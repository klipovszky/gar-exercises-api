const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const { parse } = require("csv-parse/sync");

const csvUrl =
  "https://raw.githubusercontent.com/klipovszky/gar-excercise/main/Garmin%20Exercises%20Database%20-%20Exercises.csv";

async function downloadCSV(url, dest) {
  const res = await fetch(url);
  const data = await res.text();
  fs.writeFileSync(dest, data, "utf8");
}

async function run() {
  const csvPath = "Garmin_Exercises.csv";

  if (!fs.existsSync(csvPath)) {
    console.log("Letöltés...");
    await downloadCSV(csvUrl, csvPath);
  }

  const raw = fs.readFileSync(csvPath, "utf8");
  const rows = parse(raw, {
    skip_empty_lines: true,
    from_line: 2,
  });

  // Az első sor (fejléc) kinyerése
  const headers = rows[0];
  const dataRows = rows.slice(1);

  // MUSCLE és EQUIPMENT oszlopok indexei
  const muscleCols = headers
    .map((h, i) => (h.includes("MUSCLE") ? i : -1))
    .filter((i) => i >= 0);
  const equipmentCols = headers
    .map((h, i) => (h.includes("EQUIPMENT") ? i : -1))
    .filter((i) => i >= 0);

  // URL oszlop indexének keresése (kis- és nagybetű érzéketlen)
  const urlCol = headers.findIndex(
    (h) => h.toLowerCase() === "url"
  );

  const db = new sqlite3.Database("exercises.db");
  db.serialize(() => {
    const path = require("path");
    const schemaPath = path.join(__dirname, "schema.sql");
    db.exec(fs.readFileSync(schemaPath, "utf8"));

    // INSERT utasítás módosítva, url is bekerül
    const stmt = db.prepare(`
      INSERT INTO exercises (name, category_garmin, name_garmin, found, url)
      VALUES (?, ?, ?, ?, ?)
    `);

    const muscleStmt = db.prepare(
      `INSERT INTO muscle_groups (exercise_id, muscle) VALUES (?, ?)`
    );
    const equipmentStmt = db.prepare(
      `INSERT INTO equipment (exercise_id, tool) VALUES (?, ?)`
    );

    for (let row of dataRows) {
      const [name, category, nameGarmin, foundRaw, ...rest] = row;
      if (!name) continue;

      const found =
        (foundRaw || "").toString().trim().toLowerCase() === "true";

      const url = urlCol >= 0 ? row[urlCol] : null;

      stmt.run(name, category, nameGarmin, found, url, function () {
        const id = this.lastID;

        muscleCols.forEach((i) => {
          if ((row[i] || "").toString().toLowerCase() === "true") {
            muscleStmt.run(id, headers[i]);
          }
        });

        equipmentCols.forEach((i) => {
          if ((row[i] || "").toString().toLowerCase() === "true") {
            equipmentStmt.run(id, headers[i]);
          }
        });
      });
    }

    stmt.finalize();
    muscleStmt.finalize();
    equipmentStmt.finalize();

    console.log("✅ Importálás kész. Adatbázis: exercises.db");
  });

  db.close();
}

run();
