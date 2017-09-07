'use babel';

import { CompositeDisposable } from 'atom';
import http from 'http';
import fs from 'fs';
import path from 'path';

export default {

  subscriptions: null,
  revalHost: null,

  activate(state) {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-reval:reload-current-file': () => this.reloadCurrentFile(),
      'atom-reval:clear-current-file': () => this.clearCurrentFile(),
      'atom-reval:clear-all-files': () => this.clearAllFiles(),
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  getRevalConfig(filePath) {
    let config = null;
    let configDir = path.dirname(filePath);
    let relativePath = filePath;
    let configPath;
    while (!config) {
      try {
        configPath = path.join(configDir, '.revalrc');
        fs.accessSync(configPath);
        config = fs.readFileSync(configPath, {encoding: 'utf8'});
      } catch (e) {
        // No .revalrc file in current directory
        if (configDir === '/') {
          // No more directories to try
          break;
        }
        // Traverse towards root
        configDir = path.dirname(configDir);
      };
    }
    if (!config) {
      config = 'localhost:3000';
      console.log(`atom-reval did not find .revalrc; using default ${config}`);
    }
    let hostTokens = config.split(':');
    if (hostTokens.length !== 2) {
      console.error(`Invalid .revalrc: ${configPath}`);
      hostTokens = [null, null];
    }
    let host = hostTokens[0] || 'localhost';
    let port = Number(hostTokens[1]) || '3000';
    let root = configDir;
    relativePath = path.relative(configDir, filePath);
    return {
      host,
      port,
      root,
      relativePath,
    };
  },

  getActiveRevalInfo() {
    let filePath = atom.workspace.getActiveTextEditor().getPath();
    if (!filePath) {
      atom.notifications.addWarning(`Reval Error: No File Path`, {
        description: 'Please save the file before using reval.'
      });
      return undefined;
    }
    return this.getRevalConfig(filePath);
  },

  getActiveBufferText() {
    return atom.workspace.getActiveTextEditor().getBuffer().getText();
  },

  tryRequest(options, body) {
    let req = http.request(options);
    req.on('error', error => {
      let code = error.code;
      let address = error.address;
      let port = error.port;
      atom.notifications.addWarning(`Reval Error: ${code}`, {
        detail: `Error: ${code}\nAddress: ${address}\nPort: ${port}`
      });
    });
    if (body) {
      req.write(body);
    }
    req.end();
  },

  reloadCurrentFile() {
    let info = this.getActiveRevalInfo();
    if (!info) {
      return;
    }
    let {relativePath, host, port} = info;
    this.tryRequest({
      host,
      port,
      path: '/reval/reload?filePath=' + relativePath,
      method: 'POST'
    }, this.getActiveBufferText());
  },

  clearCurrentFile() {
    let info = this.getActiveRevalInfo();
    if (!info) {
      return;
    }
    let {relativePath, host, port} = info;
    this.tryRequest({
      host,
      port,
      path: '/reval/clear',
      method: 'POST'
    }, JSON.stringify([relativePath]));
  },

  clearAllFiles() {
    let info = this.getActiveRevalInfo();
    if (!info) {
      return;
    }
    let {host, port} = info;
    this.tryRequest({
      host,
      port,
      path: '/reval/clear',
      method: 'POST'
    });
  }

};
