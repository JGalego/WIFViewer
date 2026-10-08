'use strict';
const vscode = require('vscode');
const { parseWif } = require('./wif');

class WifEditorProvider {
  constructor(context) {
    this.context = context;
  }

  resolveCustomTextEditor(document, panel) {
    const mediaUri = vscode.Uri.joinPath(this.context.extensionUri, 'media');
    panel.webview.options = { enableScripts: true, localResourceRoots: [mediaUri] };
    panel.webview.html = this.html(panel.webview, mediaUri);

    const push = () => {
      let model;
      try {
        model = parseWif(document.getText());
      } catch (e) {
        model = { error: String(e && e.message || e) };
      }
      panel.webview.postMessage({ type: 'model', model, name: document.uri.path.split('/').pop() });
    };

    const sub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) push();
    });
    panel.onDidDispose(() => sub.dispose());
    panel.webview.onDidReceiveMessage((m) => {
      if (m.type === 'ready') push();
    });
  }

  html(webview, mediaUri) {
    const script = webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'viewer.js'));
    const style = webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'viewer.css'));
    const nonce = Array.from({ length: 24 }, () => Math.random().toString(36)[2]).join('');
    return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
<link rel="stylesheet" href="${style}"></head>
<body><div id="info"></div><div id="warn"></div>
<div class="bar"><label>Cell size <input id="zoom" type="range" min="4" max="24" value="10"></label></div>
<canvas id="draft"></canvas>
<script nonce="${nonce}" src="${script}"></script></body></html>`;
  }
}

function activate(context) {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider('wifViewer.preview', new WifEditorProvider(context), {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('wifViewer.openSource', async () => {
      const uri = vscode.window.tabGroups.activeTabGroup.activeTab?.input?.uri;
      if (uri) await vscode.commands.executeCommand('vscode.openWith', uri, 'default');
    }),
    vscode.commands.registerCommand('wifViewer.openPreview', async () => {
      const uri = vscode.window.activeTextEditor?.document.uri;
      if (uri) await vscode.commands.executeCommand('vscode.openWith', uri, 'wifViewer.preview');
    })
  );
}

function deactivate() {}
module.exports = { activate, deactivate };
