import PiSdkBase from '../PiSdkBase.js';

describe('PiSdkBase', () => {
  test('should be a class with proper static properties', () => {
    expect(typeof PiSdkBase).toBe('function');
    expect(PiSdkBase.version).toBeDefined();
    expect(PiSdkBase.user).toBeNull();
    expect(PiSdkBase.connected).toBe(false);
  });

  test('should log with logPrefix', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    PiSdkBase.log('hello');
    expect(logSpy).toHaveBeenCalledWith('[PiSDK]', 'hello');
    logSpy.mockRestore();
  });

  test('should handle missing Pi SDK in connect', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Ensure Pi is missing
    delete global.window;
    global.window = {};
    await PiSdkBase.prototype.connect();
    expect(errorSpy).toHaveBeenCalledWith('[PiSDK]', 'Pi SDK not loaded.');
    errorSpy.mockRestore();
  });

  // Example CJS require usage (documented, not run):
  // const PiSdkBase = require('../index.cjs');
  // ... use PiSdkBase as above ...
});
