import sys
import json
import uuid

sys.path.append('.')
from api.database import supabase_admin

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

faq_json = questions

try:
    # Supabase uses JSON for JSONB columns, but if it's stored as JSON, we pass the python list/dict and the SDK handles it
    res = supabase_admin.table('settings').select('*').eq('key', 'faq_data').execute()
    if not res.data:
        supabase_admin.table('settings').insert({'key': 'faq_data', 'value': faq_json}).execute()
        print('Inserted new FAQ settings.')
    else:
        # Avoid overwriting if they already exist, but for this task we will just overwrite to guarantee they exist.
        supabase_admin.table('settings').update({'value': faq_json}).eq('key', 'faq_data').execute()
        print('Updated FAQ settings.')
except Exception as e:
    print('Failed to sync with Supabase:', e)
