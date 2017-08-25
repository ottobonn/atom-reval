'use babel';

import { CompositeDisposable } from 'atom';
import http from 'http';
import fs from 'fs';
import path from 'path';

export default {

  subscriptions: null,
  revalHost: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-reval:reload-current-file': () => this.reloadCurrentFile(),
      'atom-reval:clear-current-file': () => this.clearCurrentFile(),
      'atom-reval:clear-all-files': () => this.clearAllFiles(),
    }));

    this.revalHost = 'qualia.dev'; // TODO get from .revalrc
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
    return this.getRevalConfig(filePath);
  },

  getActiveBufferText() {
    return atom.workspace.getActiveTextEditor().getBuffer().getText();
  },

  reloadCurrentFile() {
    let {relativePath, host, port} = this.getActiveRevalInfo();
    let req = http.request({
      host,
      port,
      path: '/reval/reload?filePath=' + relativePath,
      method: 'POST'
    });
    req.write(this.getActiveBufferText());
    req.end();
  },

  clearCurrentFile() {
    let {relativePath, host, port} = this.getActiveRevalInfo();
    let req = http.request({
      host,
      port,
      path: '/reval/clear',
      method: 'POST'
    });
    req.write(JSON.stringify([relativePath]));
    req.end();
  },

  clearAllFiles() {
    let {host, port} = this.getActiveRevalInfo();
    let req = http.request({
      host,
      port,
      path: '/reval/clear',
      method: 'POST'
    });
    req.end();
  }

};
