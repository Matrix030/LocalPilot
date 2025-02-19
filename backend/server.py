from ollama import generate
from ollama import ChatResponse
from fastapi import FastAPI
import uvicorn
from pydantic import BaseModel

app = FastAPI()



MODEL_NAME = 'qwen2.5-coder:7b'


class AutoCompleteRequest(BaseModel):
    context: str
def call_ollama_model(prompt:str) -> str:

    response = generate(model= MODEL_NAME,
                        prompt=prompt,
                        stream=False
                        )
    # or access fields directly from the response object
    return response['response']

def format_prompt(context: str) -> str:
    prompt = f"""
CODE COMPLETION TASK
You are a highly skilled AI coding assistant. Your job is to analyze the following code snippet and generate the exact next line of code that logically and syntactically continues the snippet.
Constraints:s
- Do not rewrite the context which is being provided.
- Do not wrap your output in markdown formatting.
- Output exactly one single line of code.
- Do not include any explanations, comments, or additional text.

CODE SNIPPET:
{context}
"""
    return prompt

@app.post("/autocomplete")
async def autocomplete(request: AutoCompleteRequest):
    formatted_prompt = format_prompt(request.context)
    suggestion = call_ollama_model(formatted_prompt)

    return {"suggestion": suggestion}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port= 8000)