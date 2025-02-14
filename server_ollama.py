from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import uvicorn

app = FastAPI()


OLLAMA_URL = "http://localhost:11434/api/generate"  # Correct Ollama API endpoint
MODEL_NAME = "codegemma:7b"  # Update this to match the installed model name

# Request model for FastAPI
class AutoCompleteRequest(BaseModel):
    context: str  # The code before the cursor
    cursor_position: int  # Position of the cursor in the text

def call_ollama_model(prompt: str) -> str:
    """
    Calls the locally running Ollama model to generate a code completion.
    """
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False  # Ensure we get a full response at once
    }
    
    try:
        response = requests.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        result = response.json()
        return result.get("response", "").strip()  # Extract the generated text
    except requests.exceptions.RequestException as e:
        print("Error connecting to Ollama:", e)
        return " # Error generating suggestion"

def format_prompt(context: str) -> str:
    """
    Formats the prompt to instruct the model to generate a valid code completion.
    """
    # prompt = f"### You are an AI code Autocompletion tool, Task:You have the following code snippet. Your job is to predict the next line of code. Please produce only one single line to complete the code that logically follows from the snippet.Do not include any additional text, explanations, or commentary.### Code Snippet:{context}"
    prompt = f"""
CODE COMPLETION TASK
You are a highly skilled AI coding assistant. Your job is to analyze the following code snippet and generate the exact next line of code that logically and syntactically continues the snippet.
Constraints:
- Output exactly one single line of code.
- Do not include any explanations, comments, or additional text.
- Do not wrap your output in markdown formatting.
CODE SNIPPET:
{context}
"""
    
    return prompt

@app.post("/autocomplete")
async def autocomplete(request: AutoCompleteRequest):
    """
    API Endpoint to receive code context and return a code completion suggestion.
    """
    if not request.context.strip():
        raise HTTPException(status_code=400, detail="Context cannot be empty")
    
    formatted_prompt = format_prompt(request.context)
    suggestion = call_ollama_model(formatted_prompt)
    
    return {"suggestion": suggestion}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)


