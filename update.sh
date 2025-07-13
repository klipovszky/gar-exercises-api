#!/bin/bash

set -e  # bármilyen hiba esetén kilép

echo "🧹 Régi adatbázis törlése..."
rm -f exercises.db

echo "📐 Séma újratöltése..."
sqlite3 exercises.db < schema.sql

echo "📥 CSV importálás..."
node import_csv.js

echo "📂 Git státusz ellenőrzése..."
git add exercises.db
git add .

echo "✅ Commit készítése..."
git commit -m "🔄 Adatbázis frissítve: $(date +'%Y-%m-%d %H:%M:%S')"

echo "📤 Push a GitHub-ra..."
git push

echo "🎉 Kész!"
