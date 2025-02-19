import * as vscode from 'vscode';

interface AutoCompleteResponse {
    suggestion?: string;
}

/**
 * Extracts FIM context:
 * - prefix: the last 20 lines (or fewer) up to (and including) the current line.
 * - suffix: the next 5 lines after the cursor (if available).
 */
function getFIMContext(document: vscode.TextDocument, position: vscode.Position): { prefix: string; suffix: string } {
    const allLines = document.getText().split('\n');
    const prefixStartLine = Math.max(0, position.line - 20);
    const prefixLines = allLines.slice(prefixStartLine, position.line + 1);
    const suffixLines = allLines.slice(position.line + 1, position.line + 6);
    return {
        prefix: prefixLines.join('\n'),
        suffix: suffixLines.join('\n')
    };
}

/**
 * Fetches a streaming response from the FastAPI server.
 * As text chunks arrive, they are inserted at the updated insertion point.
 */
async function fetchStreamingResponse(prefix: string, suffix: string, initialPosition: vscode.Position, editor: vscode.TextEditor) {
    try {
        const response = await fetch("http://127.0.0.1:8000/autocomplete/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prefix, suffix })
        });
        if (!response.body) {
            throw new Error("No response body received.");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        // Get the starting offset (number of characters from the beginning of the document)
        let currentOffset = editor.document.offsetAt(initialPosition);

        while (!done) {
            const { done: doneReading, value } = await reader.read();
            done = doneReading;
            const chunk = decoder.decode(value, { stream: !done });
            // Insert the chunk at the current offset
            await editor.edit(editBuilder => {
                const pos = editor.document.positionAt(currentOffset);
                editBuilder.insert(pos, chunk);
            });
            // Update the offset by the length of the inserted chunk.
            // Note: This is a simple character count. In case of newlines or different encodings, you might need more robust logic.
            currentOffset += chunk.length;
        }
    } catch (error: any) {
        vscode.window.showErrorMessage(`Streaming Error: ${error.message}`);
    }
}

export function activate(context: vscode.ExtensionContext) {
    // Register a manual command to trigger streaming autocomplete.
    const disposableCommand = vscode.commands.registerCommand('ollamaCopilot.suggest', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor found!");
            return;
        }
        const document = editor.document;
        const position = editor.selection.active;
        const { prefix, suffix } = getFIMContext(document, position);

        await fetchStreamingResponse(prefix, suffix, position, editor);
    });

    // (Optional) Register a CompletionItemProvider if you want to trigger streaming on every keystroke.
    const provider = vscode.languages.registerCompletionItemProvider(
        ["python", "javascript"],
        {
            async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return [];
                }
                const { prefix, suffix } = getFIMContext(document, position);
                await fetchStreamingResponse(prefix, suffix, position, editor);
                return []; // No completion item is returned since we're handling insertion manually.
            }
        },
        "" // Trigger on every keystroke; adjust if needed.
    );

    context.subscriptions.push(disposableCommand);
    context.subscriptions.push(provider);
}

export function deactivate() {}
