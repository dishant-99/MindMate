import os
from huggingface_hub import InferenceClient

# Use token if available (recommended), otherwise run anonymously
token = os.getenv("HUGGINGFACEHUB_API_TOKEN", None)
client = InferenceClient("google/flan-t5-base", token=token)

prompt = "Generate 3 short supportive follow-up questions for a student who felt stressed yesterday."
out = client.text_generation(prompt, max_new_tokens=120)
print(out)
