import PiSdkBase from '../PiSdkBase';

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
    // Ensure window.Pi is missing
    delete (window as any).Pi;
    await PiSdkBase.prototype.connect();
    expect(errorSpy).toHaveBeenCalledWith('[PiSDK]', 'Pi SDK not loaded.');
    errorSpy.mockRestore();
  });

  test('only one Pi.init and Pi.authenticate is called across multiple connects', async () => {
    const originalPi = (window as any).Pi;
    const fakePi = {
      init: jest.fn(),
      authenticate: jest.fn().mockResolvedValue({ user: { name: 'demo' }, accessToken: 'tok' })
    };
    (window as any).Pi = fakePi;
    // Reset static state
    PiSdkBase.user = null;
    PiSdkBase.connected = false;

    // Clear mutex and spies if needed
    if ((PiSdkBase as any).connectMutex && (PiSdkBase as any).connectMutex.isLocked()) {
      await (PiSdkBase as any).connectMutex.release();
    }

    // Run .connect() three times in parallel
    await Promise.all([
      PiSdkBase.prototype.connect(),
      PiSdkBase.prototype.connect(),
      PiSdkBase.prototype.connect()
    ]);

    expect(fakePi.init).toHaveBeenCalledTimes(1);
    expect(fakePi.authenticate).toHaveBeenCalledTimes(1);

    // Clean up
    if (originalPi) {
      (window as any).Pi = originalPi;
    } else {
      delete (window as any).Pi;
    }
  });

  // Example CJS require usage (documented, not run):
  // const PiSdkBase = require('../index.cjs');
  // ... use PiSdkBase as above ...
});
