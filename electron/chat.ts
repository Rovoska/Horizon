import * as electron from 'electron';

import * as remote from '@electron/remote';
const webContents = remote.getCurrentWebContents();

// tslint:disable-next-line:no-require-imports no-submodule-imports
require('@electron/remote/main').enable(webContents);

import Axios from 'axios';
import { exec, execSync } from 'child_process';
import * as path from 'path';
import * as qs from 'querystring';
import { getKey } from '../chat/common';
import { EventBus } from '../chat/preview/event-bus';
import { init as initCore } from '../chat/core';
import l, { setLanguage } from '../chat/localize';
// import {setupRaven} from '../chat/vue-raven';
import Socket from '../chat/WebSocket';
import Connection from '../fchat/connection';
import { Keys } from '../keys';
import { GeneralSettings /*, nativeRequire*/ } from './common';
import { Logs, SettingsStore } from './filesystem';
import Notifications from './notifications';
import { handleStartupImport } from './services';
import Index from './Index.vue';
import log from 'electron-log'; // tslint:disable-line: match-default-export-name
import { WordPosSearch } from '../learn/dictionary/word-pos-search';
import { MenuItemConstructorOptions } from 'electron/main';

log.debug('init.chat');

document.addEventListener(
  'keydown',
  process.platform !== 'darwin'
    ? (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && getKey(e) === Keys.KeyI)
          remote.getCurrentWebContents().toggleDevTools();
      }
    : (e: KeyboardEvent) => {
        if (e.metaKey && e.altKey && getKey(e) === Keys.KeyI)
          remote.getCurrentWebContents().toggleDevTools();
      }
);

/* process.env.SPELLCHECKER_PREFER_HUNSPELL = '1';
const sc = nativeRequire<{
    Spellchecker: new() => {
        add(word: string): void
        remove(word: string): void
        isMisspelled(x: string): boolean
        setDictionary(name: string | undefined, dir: string): void
        getCorrectionsForMisspelling(word: string): ReadonlyArray<string>
    }
}>('spellchecker/build/Release/spellchecker.node');
const spellchecker = new sc.Spellchecker();*/

Axios.defaults.params = { __fchat: `desktop/${remote.app.getVersion()}` };

if (process.env.NODE_ENV === 'production') {
  // setupRaven('https://a9239b17b0a14f72ba85e8729b9d1612@sentry.f-list.net/2', remote.app.getVersion());

  remote.getCurrentWebContents().on('devtools-opened', () => {
    console.log(
      `%c${l('consoleWarning.head')}`,
      'background: red; color: yellow; font-size: 30pt'
    );
    console.log(`%c${l('consoleWarning.body')}`, 'font-size: 16pt; color:red');
  });
}
let browser: string | undefined;

function openIncognito(url: string): void {
  if (browser === undefined)
    try {
      //tslint:disable-next-line:max-line-length
      browser = execSync(
        `FOR /F "skip=2 tokens=3" %A IN ('REG QUERY HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice /v ProgId') DO @(echo %A)`
      )
        .toString()
        .trim()
        .toLowerCase();
    } catch (e) {
      console.error(e);
    }
  const commands = {
    chrome: 'chrome.exe -incognito',
    firefox: 'firefox.exe -private-window',
    vivaldi: 'vivaldi.exe -incognito',
    opera: 'opera.exe -private'
  };
  let start = 'iexplore.exe -private';
  for (const key in commands)
    if (browser!.indexOf(key) !== -1)
      start = commands[<keyof typeof commands>key];
  exec(`start ${start} ${url}`);
}

const wordPosSearch = new WordPosSearch();

webContents.on('context-menu', (_, props) => {
  const hasText = props.selectionText.trim().length > 0;
  const can = (type: string) =>
    (<Electron.EditFlags & { [key: string]: boolean }>props.editFlags)[
      `can${type}`
    ] && hasText;

  const menuTemplate: Electron.MenuItemConstructorOptions[] = [];
  if (hasText || props.isEditable)
    menuTemplate.push({
      id: 'copy',
      label: l('action.copy'),
      role: can('Copy') ? 'copy' : undefined,
      accelerator: 'CmdOrCtrl+C',
      enabled: can('Copy')
    });
  if (props.isEditable)
    menuTemplate.push(
      {
        id: 'cut',
        label: l('action.cut'),
        role: can('Cut') ? 'cut' : undefined,
        accelerator: 'CmdOrCtrl+X',
        enabled: can('Cut')
      },
      {
        id: 'paste',
        label: l('action.paste'),
        role: props.editFlags.canPaste ? 'paste' : undefined,
        accelerator: 'CmdOrCtrl+V',
        enabled: props.editFlags.canPaste
      },
      {
        id: 'delete',
        label: l('action.delete'),
        role: props.editFlags.canDelete ? 'delete' : undefined,
        enabled: props.editFlags.canDelete
      },
      {
        id: 'selectAll',
        label: l('action.selectAll'),
        role: props.editFlags.canSelectAll ? 'selectAll' : undefined,
        accelerator: 'CmdOrCtrl+A',
        enabled: props.editFlags.canSelectAll
      }
    );
  else if (
    props.linkURL.length > 0 &&
    props.linkURL.substr(0, props.pageURL.length) !== props.pageURL
  ) {
    if (props.mediaType === 'none') {
      menuTemplate.push({
        id: 'toggleStickyness',
        label: l('action.toggleStickyPreview'),
        click(): void {
          EventBus.$emit('imagepreview-toggle-stickyness', {
            url: props.linkURL
          });
        }
      });
    }
    menuTemplate.push({
      id: 'copyLink',
      label: l('action.copyLink'),
      click(): void {
        if (process.platform === 'darwin')
          electron.clipboard.writeBookmark(props.linkText, props.linkURL);
        else electron.clipboard.writeText(props.linkURL);
      }
    });

    if (process.platform === 'win32')
      menuTemplate.push({
        id: 'incognito',
        label: l('action.incognito'),
        click: () => openIncognito(props.linkURL)
      });
  } else if (hasText)
    menuTemplate.push({
      label: l('action.copyWithoutBBCode'),
      enabled: can('Copy'),
      accelerator: 'CmdOrCtrl+Shift+C',
      click: () => electron.clipboard.writeText(props.selectionText)
    });
  if (props.misspelledWord !== '') {
    const corrections = props.dictionarySuggestions; //spellchecker.getCorrectionsForMisspelling(props.misspelledWord);
    menuTemplate.unshift(
      {
        label: l('spellchecker.add'),
        click: () =>
          electron.ipcRenderer.send('dictionary-add', props.misspelledWord)
      },
      { type: 'separator' }
    );
    if (corrections.length > 0)
      menuTemplate.unshift(
        ...corrections.map((correction: string) => ({
          label: correction,
          click: () => webContents.replaceMisspelling(correction)
        }))
      );
    else
      menuTemplate.unshift({
        enabled: false,
        label: l('spellchecker.noCorrections')
      });
  } else if (settings.customDictionary.indexOf(props.selectionText) !== -1)
    menuTemplate.unshift(
      {
        label: l('spellchecker.remove'),
        click: () =>
          electron.ipcRenderer.send('dictionary-remove', props.selectionText)
      },
      { type: 'separator' }
    );

  const lookupWord = props.selectionText || wordPosSearch.getLastClickedWord();

  if (lookupWord) {
    menuTemplate.unshift(
      {
        label: `Look up '${lookupWord}'`,
        click: async () => {
          EventBus.$emit('word-definition', {
            lookupWord,
            x: props.x,
            y: props.y
          });
        }
      },
      { type: 'separator' }
    );
  }

  if (props.srcURL.startsWith('https://static.f-list.net/images/eicon/')) {
    let eiconName = props.titleText;
    //Electron on Mac allows for header context menu items, so we use that instead of a disabled item split of by a seperator.
    menuTemplate.unshift(
      {
        label: eiconName,
        enabled: false,
        type: process.platform === 'darwin' ? 'header' : 'normal'
      },
      ...(process.platform === 'darwin'
        ? []
        : [
            {
              type: 'separator'
            } as MenuItemConstructorOptions
          ]),
      {
        label: l('action.eicon.copy'),
        click: () => {
          electron.clipboard.writeText(eiconName);
        }
      },
      {
        label: l('action.eicon.copyBbcode'),

        click: () => {
          electron.clipboard.writeText(`[eicon]${eiconName}[/eicon]`);
        }
      },
      {
        label: l('eicon.addToFavorites'),
        click: async () => {
          EventBus.$emit('eicon-pinned', {
            eicon: eiconName
          });
        }
      }
    );
  }

  if (menuTemplate.length > 0)
    remote.Menu.buildFromTemplate(menuTemplate).popup({});

  log.debug('context.text', {
    linkText: props.linkText,
    misspelledWord: props.misspelledWord,
    selectionText: props.selectionText,
    titleText: props.titleText
  });
});

let dictDir = path.join(remote.app.getPath('userData'), 'spellchecker');

if (process.platform === 'win32')
  //get the path in DOS (8-character) format as special characters cause problems otherwise
  exec(
    `for /d %I in ("${dictDir}") do @echo %~sI`,
    (_, stdout) => (dictDir = stdout.trim())
  );

// electron.webFrame.setSpellCheckProvider(
// '', {spellCheck: (words, callback) => callback(words.filter((x) => spellchecker.isMisspelled(x)))});

function onSettings(s: GeneralSettings): void {
  settings = s;

  log.transports.file.level = settings.risingSystemLogLevel;
  log.transports.console.level = settings.risingSystemLogLevel;

  // spellchecker.setDictionary(s.spellcheckLang, dictDir);
  // for(const word of s.customDictionary) spellchecker.add(word);

  // Apply display language live when settings change
  try {
    setLanguage(settings.displayLanguage);
  } catch (e) {
    console.warn('Failed to apply display language', e);
  }
}

electron.ipcRenderer.on(
  'settings',
  (_: Electron.IpcRendererEvent, s: GeneralSettings) => onSettings(s)
);

const params = <{ [key: string]: string | undefined }>(
  qs.parse(window.location.search.substr(1))
);
let settings = <GeneralSettings>JSON.parse(params['settings']!);

log.info(
  '[chat.ts] params[import]:',
  params['import'],
  'type:',
  typeof params['import']
);

if (params['import'] !== undefined && params['import'] !== '') {
  log.info('[chat.ts] Calling handleStartupImport');
  handleStartupImport(settings, params['import'])
    .then(updatedSettings => {
      settings = updatedSettings;
      onSettings(settings);
    })
    .catch(err => {
      log.error('Startup import error:', err);
    });
} else {
  log.info('[chat.ts] Skipping import, calling onSettings directly');
  onSettings(settings);
}

// Apply UI language early (fallback handled in setLanguage)
try {
  setLanguage(settings.displayLanguage);
} catch (e) {
  console.warn('Failed to apply display language', e);
}

log.debug('init.chat.core');

const connection = new Connection(
  `Horizon (${process.platform})`,
  remote.app.getVersion(),
  Socket
);
initCore(connection, settings, Logs, SettingsStore, Notifications);

log.debug('init.chat.vue');

//tslint:disable-next-line:no-unused-expression
new Index({
  el: '#app',
  data: {
    settings,
    hasCompletedUpgrades: JSON.parse(params['hasCompletedUpgrades']!)
  }
});

log.debug('init.chat.vue.done');
