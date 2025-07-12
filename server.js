const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const db = new sqlite3.Database('./exercises.db');

app.use(cors());

app.get('/exercises', (req, res) => {
  const { muscle, tool, name } = req.query;

  let sql = `
    SELECT e.*
    FROM exercises e
    LEFT JOIN muscle_groups m ON e.id = m.exercise_id
    LEFT JOIN equipment eq ON e.id = eq.exercise_id
    WHERE 1=1
  `;
  const params = [];

  if (muscle) {
    sql += ' AND LOWER(m.muscle) LIKE ?';
    params.push(`%${muscle.toLowerCase()}%`);
  }

  if (tool) {
    sql += ' AND LOWER(eq.tool) LIKE ?';
    params.push(`%${tool.toLowerCase()}%`);
  }

  if (name) {
    sql += ' AND LOWER(e.name) LIKE ?';
    params.push(`%${name.toLowerCase()}%`);
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`✅ API running on port ${port}`);
});

