import * as vscode from 'vscode';

interface AutoCompleteResponse {
    suggestion?: string;
}

export function activate(context: vscode.ExtensionContext) {

    const disposableCommand = vscode.commands.registerCommand('ollamaCopilot.suggest', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor found!");
            return;
        }

        const document = editor.document;
        const position = editor.selection.active;
        const range = new vscode.Range(new vscode.Position(0, 0), position);
        const contextText = document.getText(range);

        try {
            const response = await fetch("http://127.0.0.1:8000/autocomplete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    context: contextText,
                    cursor_position: document.offsetAt(position)
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Cast the JSON to our interface
            const data = (await response.json()) as AutoCompleteResponse;

            if (data.suggestion) {
                await editor.insertSnippet(new vscode.SnippetString(data.suggestion));
            } else {
                vscode.window.showInformationMessage("No suggestion returned from server.");
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to get suggestion: ${error.message}`);
        }
    });

    const provider = vscode.languages.registerCompletionItemProvider(
        ["python", "javascript"],
        {
            async provideCompletionItems(document, position) {
                const range = new vscode.Range(new vscode.Position(0, 0), position);
                const contextText = document.getText(range);

                try {
                    const response = await fetch("http://127.0.0.1:8000/autocomplete", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            context: contextText,
                            cursor_position: document.offsetAt(position)
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    // Cast the JSON to our interface
                    const data = (await response.json()) as AutoCompleteResponse;

                    if (data.suggestion) {
                        const completion = new vscode.CompletionItem(
                            data.suggestion,
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
        "." // Trigger character
    );

    context.subscriptions.push(disposableCommand);
    context.subscriptions.push(provider);
}

export function deactivate() {}