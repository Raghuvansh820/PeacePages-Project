from flask import Flask, request, jsonify, render_template
import sqlite3

app = Flask(__name__)

DB_FILE = "diary_entries.db"

# Initialize the SQLite database
def initialize_database():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS diary_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unique identifier for each entry
            date TEXT NOT NULL,
            entry TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# Initialize the database when the app starts
initialize_database()

# Route to save a diary entry
@app.route('/save-entry', methods=['POST'])
def save_entry():
    data = request.get_json()
    date = data.get('date')
    summary = data.get('summary')
    if not date or not summary:
        return jsonify({"error": "Invalid input"}), 400

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        # Insert a new diary entry (no overwriting)
        cursor.execute("INSERT INTO diary_entries (date, entry) VALUES (?, ?)", (date, summary))
        conn.commit()
        return jsonify({"message": f"Entry for {date} saved successfully!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# Route to fetch all diary entries
@app.route('/view-entries', methods=['GET'])
def view_entries():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT date, entry FROM diary_entries ORDER BY id ASC")  # Fetch all entries
        rows = cursor.fetchall()
        conn.close()

        # Convert to JSON format
        entries = [{"date": row[0], "entry": row[1]} for row in rows]
        return jsonify(entries), 200
    except Exception as e:
        conn.close()
        print(f"Error: {e}")
        return jsonify({"error": "Failed to fetch diary entries"}), 500

# Serve the frontend
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
