/**
 * CodePilotAI - AI-Powered Code Autocompletion for VS Code
 *
 * Copyright 2024 [Your Name or Your Project]
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



import * as vscode from 'vscode';
import ollama from 'ollama'; // Install via: npm install ollama

// Adjust the model name to your installed Ollama model
const MODEL_NAME = 'qwen2.5-coder:7b';

/**
 * Builds a simple prompt for code completion.
 */
function formatPrompt(context: string): string {
    return `
CODE COMPLETION TASK
You are a highly skilled AI coding assistant. Your job is to analyze the following code snippet and generate the exact next line of code that logically and syntactically continues the snippet.
Constraints:
- Do not rewrite the context which is being provided.
- Do not wrap your output in markdown formatting.
- Output exactly one single line of code.
- Do not include any explanations, comments, or additional text.

CODE SNIPPET:
${context}
`;
}

export function activate(context: vscode.ExtensionContext) {
    // Manual command: "ollamaCopilot.suggest"
    const disposableCommand = vscode.commands.registerCommand('ollamaCopilot.suggest', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor found!");
            return;
        }

        // Capture all text up to the current cursor
        const document = editor.document;
        const position = editor.selection.active;
        const range = new vscode.Range(new vscode.Position(0, 0), position);
        const contextText = document.getText(range);

        try {
            // Format the prompt
            const prompt = formatPrompt(contextText);

            // Call Ollama synchronously (no streaming)
            const response = await ollama.generate({
                model: MODEL_NAME,
                prompt: prompt,
                stream: false,
            });
            
            // Extract the suggestion text from the model response
            const suggestion = response?.response?.trim() ?? "";

            if (suggestion) {
                // Insert the suggestion at the cursor position
                await editor.insertSnippet(new vscode.SnippetString(suggestion));
            } else {
                vscode.window.showInformationMessage("No suggestion returned from the model.");
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to get suggestion: ${error.message}`);
        }
    });

    // CompletionItemProvider: auto-suggest when typing in Python or JS files
    const provider = vscode.languages.registerCompletionItemProvider(
        ["python", "javascript"],
        {
            async provideCompletionItems(document, position) {
                const range = new vscode.Range(new vscode.Position(0, 0), position);
                const contextText = document.getText(range);

                try {
                    const prompt = formatPrompt(contextText);

                    // Call Ollama synchronously (no streaming)
                    const response = await ollama.chat({
                        model: MODEL_NAME,
                        messages: [{ role: 'user', content: prompt }],
                        stream: false,
                        // temperature: 0.1,
                        // max_tokens: 100
                    });

                    const suggestion = response?.message?.content?.trim() ?? "";

                    if (suggestion) {
                        const completion = new vscode.CompletionItem(
                            suggestion,
                            vscode.CompletionItemKind.Snippet
                        );
                        return [completion];
                    }
                } catch (error) {
                    console.error("Error fetching suggestion:", error);
                }
                return [];
            }
        },
        "." // Trigger character (unchanged)
    );

    context.subscriptions.push(disposableCommand);
    context.subscriptions.push(provider);
}

export function deactivate() {}