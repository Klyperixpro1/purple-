import sqlite3
import json
import uuid

questions = [
    {
        'id': str(uuid.uuid4()),
        'question': 'What types of videos do you edit?',
        'answer': 'We edit short videos, YouTube content, ads, and podcast videos for creators and brands.',
        'order': 0,
        'status': 'published'
    },
    {
        'id': str(uuid.uuid4()),
        'question': 'How fast can you deliver my video?',
        'answer': 'Our standard turnaround time is typically 48-72 hours, depending on the complexity of the project.',
        'order': 1,
        'status': 'published'
    },
    {
        'id': str(uuid.uuid4()),
        'question': 'Do you offer revisions if needed?',
        'answer': 'Yes, we offer revisions to ensure the final product aligns perfectly with your vision.',
        'order': 2,
        'status': 'published'
    },
    {
        'id': str(uuid.uuid4()),
        'question': 'Can you improve my content flow?',
        'answer': 'Absolutely. We specialize in optimizing pacing and flow to maximize audience retention.',
        'order': 3,
        'status': 'published'
    },
    {
        'id': str(uuid.uuid4()),
        'question': 'How do we start working together?',
        'answer': 'Simply reach out via our contact form or book a call, and we will discuss your specific needs.',
        'order': 4,
        'status': 'published'
    },
    {
        'id': str(uuid.uuid4()),
        'question': 'Do you edit for social media?',
        'answer': 'Yes, we format videos specifically for TikTok, Instagram Reels, and YouTube Shorts.',
        'order': 5,
        'status': 'published'
    }
]

db_path = 'api/data/klyperix.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

faq_json = json.dumps(questions)

c.execute("SELECT * FROM settings WHERE key_name='faq_data'")
row = c.fetchone()
if row:
    c.execute("UPDATE settings SET value=? WHERE key_name='faq_data'", (faq_json,))
else:
    c.execute("INSERT INTO settings (key_name, value) VALUES (?, ?)", ('faq_data', faq_json))

conn.commit()

import sys
sys.path.append('.')
from api.database import supabase_admin
if supabase_admin:
    try:
        supabase_admin.table('settings').upsert({'key_name': 'faq_data', 'value': faq_json}).execute()
    except Exception as e:
        print("Supabase err:", e)

print('Seeded FAQ data into SQLite & Supabase!')
