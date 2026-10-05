from groq import Groq

from app.core.config import settings


client = Groq(api_key=settings.GROQ_API_KEY)

# Fast, free-tier friendly production model
CHAT_MODEL = "openai/gpt-oss-20b"


def generate_text(prompt: str) -> str:
    response = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        temperature=0.2,
    )

    return (response.choices[0].message.content or "").strip()
