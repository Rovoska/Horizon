import * as qs from 'querystring';
import log from 'electron-log'; //tslint:disable-line:match-default-export-name

import { GeneralSettings } from './common';
import ExporterWindow from './Exporter.vue';

log.info('init.exporter');

const params = <{ [key: string]: string | undefined }>(
  qs.parse(window.location.search.slice(1))
);
const settings = <GeneralSettings>JSON.parse(params['settings']!);
const importHint = params['import'];

const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'silly';

log.transports.file.level = settings.risingSystemLogLevel || logLevel;
log.transports.console.level = settings.risingSystemLogLevel || logLevel;
log.transports.file.maxSize = 5 * 1024 * 1024;

log.info('init.exporter.vue');

const exporterApp = new ExporterWindow({
  el: '#exporterWindow',
  data: { settings, importHint }
});

log.debug('init.exporter.vue.done');

export default exporterApp;
