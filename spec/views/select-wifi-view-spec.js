'use babel';
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import SettingsHelper from '../../lib/utils/settings-helper';
import SelectWifiView from '../../lib/views/select-wifi-view';
import packageName from '../../lib/utils/package-helper';
import _s from 'underscore.string';

let defaultExport = {};
describe('Select Wifi View', function() {
  let activationPromise = null;
  let main = null;
  let selectWifiView = null;
  let originalProfile = null;
  let workspaceElement = null;

  beforeEach(function() {
    workspaceElement = atom.views.getView(atom.workspace);
    activationPromise = atom.packages.activatePackage(packageName()).then(function({mainModule}) {
      main = mainModule;
      return selectWifiView = new SelectWifiView;
    });

    originalProfile = SettingsHelper.getProfile();
    // For tests not to mess up our profile, we have to switch to test one...
    SettingsHelper.setProfile('test');

    // Mock serial
    require.cache[require.resolve('serialport')].defaultExport = require('particle-dev-spec-stubs').serialportSuccess;

    return waitsForPromise(() => activationPromise);
  });

  afterEach(() => SettingsHelper.setProfile(originalProfile));

  return describe('', function() {
    it('tests loading items', function() {
      SettingsHelper.setCredentials('foo@bar.baz', '0123456789abcdef0123456789abcdef');
      spyOn(selectWifiView, 'listNetworks');

      selectWifiView.show();

      expect(selectWifiView.listNetworks).toHaveBeenCalled();

      jasmine.unspy(selectWifiView, 'listNetworks');
      SettingsHelper.clearCredentials();
      return selectWifiView.hide();
    });

    xit('test listing networks on Darwin', function() {
      SettingsHelper.setCredentials('foo@bar.baz', '0123456789abcdef0123456789abcdef');

      process.platform = 'darwin';

      spyOn(selectWifiView, 'getPlatform').andReturn('darwin');
      spyOn(selectWifiView, 'listNetworksDarwin').andCallThrough();
      spyOn(selectWifiView.cp, 'exec').andCallFake(function(command, callback) {
        let stdout;
        if (_s.endsWith(command) === '-I') {
          stdout = `     agrCtlRSSI: -40\n\
agrExtRSSI: 0\n\
agrCtlNoise: -92\n\
agrExtNoise: 0\n\
state: running\n\
op mode: station \n\
lastTxRate: 130\n\
maxRate: 144\n\
lastAssocStatus: 0\n\
802.11 auth: open\n\
link auth: wpa2-psk\n\
BSSID: fc:91:e3:47:92:d3\n\
SSID: foo\n\
MCS: 15\n\
channel: 6`;

        } else {
          stdout = `                            SSID BSSID             RSSI CHANNEL HT CC SECURITY (auth/unicast/group)\n\
UPC0044189 fc:94:e3:32:3e:a8 -49  11      Y  -- NONE \n\
UPC Wi-Free fe:94:e3:32:3e:aa -51  11      Y  -- WPA(802.1x/AES,TKIP/TKIP) \n\
pstryk c8:3a:35:11:8d:b0 -83  6,-1    Y  -- WEP \n\
UPC Wi-Free fe:94:e3:21:92:d5 -36  6       Y  -- WPA(802.1x/AES,TKIP/TKIP) \n\
foo fc:94:e3:21:92:d3 -37  6       Y  -- WPA(PSK/AES,TKIP/TKIP) WPA2(PSK/AES,TKIP/TKIP) `;
        }

        return callback('', stdout);
      });

      spyOn(selectWifiView, 'setItems');

      selectWifiView.show();

      return runs(function() {
        expect(selectWifiView.find('span.loading-message').text()).toEqual('Scaning for networks...');
        expect(selectWifiView.listNetworksDarwin).toHaveBeenCalled();

        expect(selectWifiView.setItems).toHaveBeenCalled();
        expect(selectWifiView.setItems.calls.length).toEqual(2);

        let args = selectWifiView.setItems.calls[0].args[0];
        expect(args.length).toEqual(1);
        expect(args[0].ssid).toEqual('Enter SSID manually');
        expect(args[0].security).toBe(null);

        args = selectWifiView.setItems.calls[1].args[0];
        expect(args.length).toEqual(5);
        expect(args[0].ssid).toEqual('foo');
        expect(args[0].bssid).toEqual('fc:94:e3:21:92:d3');
        expect(args[0].rssi).toEqual('-37');
        expect(args[0].channel).toEqual('6');
        expect(args[0].ht).toEqual('Y');
        expect(args[0].cc).toEqual('--');
        expect(args[0].security_string).toEqual('WPA(PSK/AES,TKIP/TKIP) WPA2(PSK/AES,TKIP/TKIP) ');
        expect(args[0].security).toEqual(3);

        expect(args[1].security).toEqual(0);
        expect(args[2].security).toEqual(2);
        expect(args[3].security).toEqual(1);

        expect(args[4].ssid).toEqual('Enter SSID manually');
        expect(args[4].security).toBe(null);

        jasmine.unspy(selectWifiView, 'setItems');
        jasmine.unspy(selectWifiView.cp, 'exec');
        jasmine.unspy(selectWifiView, 'listNetworksDarwin');
        jasmine.unspy(selectWifiView, 'getPlatform');
        SettingsHelper.clearCredentials();
        return selectWifiView.hide();
      });
    });

    xit('test listing networks on Windows', function() {
      SettingsHelper.setCredentials('foo@bar.baz', '0123456789abcdef0123456789abcdef');
      main.selectWifiView = null;
      main.initView('select-wifi');
      ({ selectWifiView } = main);
      spyOn(selectWifiView, 'getPlatform').andReturn('win32');

      spyOn(selectWifiView, 'listNetworksWindows').andCallThrough();
      spyOn(selectWifiView.cp, 'exec').andCallFake(function(command, callback) {
        let stdout;
        const fs = require('fs-plus');
        if (command.indexOf('show interfaces') > -1) {
          stdout = fs.readFileSync(__dirname + '/../data/interfaces-win.txt');
        } else {
          stdout = fs.readFileSync(__dirname + '/../data/networks-win.txt');
        }

        return callback('', stdout.toString());
      });

      spyOn(selectWifiView, 'setItems');

      selectWifiView.show();

      return runs(function() {
        expect(selectWifiView.find('span.loading-message').text()).toEqual('Scaning for networks...');
        expect(selectWifiView.listNetworksWindows).toHaveBeenCalled();

        expect(selectWifiView.setItems).toHaveBeenCalled();
        expect(selectWifiView.setItems.calls.length).toEqual(2);

        let args = selectWifiView.setItems.calls[0].args[0];
        expect(args.length).toEqual(1);
        expect(args[0].ssid).toEqual('Enter SSID manually');
        expect(args[0].security).toBe(null);

        args = selectWifiView.setItems.calls[1].args[0];
        expect(args.length).toEqual(6);
        expect(args[0].ssid).toEqual('foo');
        expect(args[0].bssid).toEqual('c8:d7:19:39:a6:74');
        expect(args[0].rssi).toEqual('96');
        expect(args[0].channel).toEqual('3');
        expect(args[0].authentication).toEqual('WPA2-Personal');
        expect(args[0].encryption).toEqual('CCMP');
        expect(args[0].security).toEqual(3);

        expect(args[1].security).toEqual(2);
        expect(args[2].security).toEqual(3);
        expect(args[3].security).toEqual(0);
        expect(args[4].security).toEqual(1);

        expect(args[5].ssid).toEqual('Enter SSID manually');
        expect(args[5].security).toBe(null);

        jasmine.unspy(selectWifiView, 'setItems');
        jasmine.unspy(selectWifiView.cp, 'exec');
        jasmine.unspy(selectWifiView, 'listNetworksWindows');
        jasmine.unspy(selectWifiView, 'getPlatform');
        SettingsHelper.clearCredentials();
        return selectWifiView.hide();
      });
    });

    return it('tests selecting item', function() {
      SettingsHelper.setCredentials('foo@bar.baz', '0123456789abcdef0123456789abcdef');

      selectWifiView.show();

      return runs(function() {
        spyOn(main.emitter, 'emit');

        selectWifiView.confirmed(selectWifiView.items[0]);

        expect(main.emitter.emit).toHaveBeenCalled();
        expect(main.emitter.emit).toHaveBeenCalledWith(`${packageName()}:enter-wifi-credentials`, { port: null});

        jasmine.unspy(main.emitter, 'emit');
        SettingsHelper.clearCredentials();
        return selectWifiView.hide();
      });
    });
  });
});
export default defaultExport;
