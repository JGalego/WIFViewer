'use strict';
const vscode = require('vscode');
const { parseWif, diagnose } = require('./wif');

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
    panel.webview.onDidReceiveMessage(async (m) => {
      if (m.type === 'ready') push();
      if (m.type === 'export') await this.save(document, m);
    });
  }

  async save(document, m) {
    const base = document.uri.path.split('/').pop().replace(/\.wif$/i, '');
    const isPng = m.format === 'png';
    if (!isPng && m.format !== 'svg') return;
    const target = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.joinPath(document.uri, '..', `${base}.${m.format}`),
      filters: isPng ? { PNG: ['png'] } : { SVG: ['svg'] },
    });
    if (!target) return;
    const bytes = isPng
      ? Buffer.from(String(m.data).replace(/^data:image\/png;base64,/, ''), 'base64')
      : Buffer.from(String(m.data), 'utf8');
    await vscode.workspace.fs.writeFile(target, bytes);
    vscode.window.showInformationMessage(`Saved ${target.path.split('/').pop()}`);
  }

  html(webview, mediaUri) {
    const script = webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'viewer.js'));
    const style = webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'viewer.css'));
    const nonce = Array.from({ length: 24 }, () => Math.random().toString(36)[2]).join('');
    return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
<link rel="stylesheet" href="${style}"></head>
<body><div id="info"></div><div id="warn"></div>
<div class="bar">
<label>Cell size <input id="zoom" type="range" min="2" max="40" value="10"></label>
<button id="fit">Fit</button>
<button id="png">Export PNG</button>
<button id="svg">Export SVG</button>
<span id="hint">hover = inspect · click = highlight thread · ctrl+wheel = zoom</span>
</div>
<div id="wrap"><canvas id="draft"></canvas></div>
<div id="tip" hidden></div>
<script nonce="${nonce}" src="${script}"></script></body></html>`;
  }
}

const activeUri = () =>
  vscode.window.activeTextEditor?.document.uri ?? vscode.window.tabGroups.activeTabGroup.activeTab?.input?.uri;

function activate(context) {
  const diags = vscode.languages.createDiagnosticCollection('wif');
  const refresh = (doc) => {
    if (!doc.uri.path.toLowerCase().endsWith('.wif')) return;
    diags.set(
      doc.uri,
      diagnose(doc.getText()).map((d) => {
        const line = Math.min(d.line, Math.max(0, doc.lineCount - 1));
        return new vscode.Diagnostic(
          doc.lineAt(line).range,
          d.message,
          d.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
        );
      })
    );
  };
  vscode.workspace.textDocuments.forEach(refresh);
  context.subscriptions.push(
    diags,
    vscode.workspace.onDidOpenTextDocument(refresh),
    vscode.workspace.onDidChangeTextDocument((e) => refresh(e.document)),
    vscode.workspace.onDidCloseTextDocument((d) => diags.delete(d.uri)),
    vscode.window.registerCustomEditorProvider('wifViewer.preview', new WifEditorProvider(context), {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('wifViewer.openSource', async () => {
      const uri = vscode.window.tabGroups.activeTabGroup.activeTab?.input?.uri;
      if (uri) await vscode.commands.executeCommand('vscode.openWith', uri, 'default');
    }),
    vscode.commands.registerCommand('wifViewer.openSide', async (arg) => {
      const uri = arg instanceof vscode.Uri ? arg : activeUri();
      if (!uri) return;
      // Text on the left, preview beside it. Both share one TextDocument, so edits show live.
      await vscode.commands.executeCommand('vscode.openWith', uri, 'default', vscode.ViewColumn.Active);
      await vscode.commands.executeCommand('vscode.openWith', uri, 'wifViewer.preview', {
        viewColumn: vscode.ViewColumn.Beside,
        preserveFocus: true,
      });
    }),
    vscode.commands.registerCommand('wifViewer.openPreview', async () => {
      const uri = vscode.window.activeTextEditor?.document.uri;
      if (uri) await vscode.commands.executeCommand('vscode.openWith', uri, 'wifViewer.preview');
    })
  );
  return {
    extendMarkdownIt(md) {
      return md.use(require('./markdown').plugin);
    },
  };
}

function deactivate() {}
module.exports = { activate, deactivate };
