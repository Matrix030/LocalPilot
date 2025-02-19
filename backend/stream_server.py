from ollama import generate
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
import uvicorn
from pydantic import BaseModel
import time

app = FastAPI()

MODEL_NAME = 'qwen2.5-coder:7b'

# ✅ Fix: Update the request model to use `prefix` and `suffix` (instead of `context`)
class AutoCompleteRequest(BaseModel):
    prefix: str
    suffix: str

# ✅ Fix: Modify the prompt format for FIM-based autocompletion
def format_fim_prompt(prefix: str, suffix: str) -> str:
    """
    Format the prompt for Code Completion with Fill-in-the-Middle (FIM) tokens.
    """
    return f"""
    CODE COMPLETION TASK
    You are a highly skilled AI coding assistant. Your job is to analyze the following code snippet and generate the exact next line of code that logically and syntactically continues the snippet.
    Constraints:
    - Do not rewrite the context which is being provided.
    - Do not wrap your output in markdown formatting.
    - Output exactly one single line of code.
    - Do not include any explanations, comments, or additional text.
    <|fim_prefix|>{prefix}<|fim_suffix|>{suffix}<|fim_middle|>"""

def call_ollama_model_stream(prompt: str):
    """
    Calls the Ollama model in streaming mode and yields each generated chunk.
    """
    start_time = time.time()
    for chunk in generate(model=MODEL_NAME, prompt=prompt, stream=True):
        yield chunk['response']
    end_time = time.time()
    response_time_ms = (end_time - start_time) * 1000
    print(f'Time taken for streaming response in ms: {response_time_ms}')

@app.post("/autocomplete/stream")
async def autocomplete_stream(request: AutoCompleteRequest):
    if not request.prefix.strip():
        raise HTTPException(status_code=400, detail="Prefix cannot be empty")

    formatted_prompt = format_fim_prompt(request.prefix, request.suffix)
    return StreamingResponse(call_ollama_model_stream(formatted_prompt), media_type="text/plain")

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
