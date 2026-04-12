import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """
You are SleepSync, an intelligent scheduling assistant. Your goals in order of priority are:
1. Protect the user's sleep — never let scheduling reduce sleep below 7 hours
2. Mimic the user's own scheduling preferences and habits
3. Optimize the schedule around high priority fixed tasks
4. Inject relaxation or meditation when the user is stressed
5. Be kind, conversational, and never robotic

Always reply in this exact JSON format with no extra text:
{
  "message": "Your friendly response to the user",
  "action": "none",
  "task_name": null,
  "new_time": null,
  "warning": null
}
"""

def chat_with_ai(user_message: str, schedule_context: dict) -> dict:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            { "role": "system", "content": SYSTEM_PROMPT },
            # the user message includes the full schedule context AND what the user said
            # bundling them together means the AI always has the full picture
            { "role": "user", "content": f"Current schedule: {schedule_context}\n\nUser said: {user_message}" }
        ],
        response_format={ "type": "json_object" }
    )
    return json.loads(response.choices[0].message.content)
