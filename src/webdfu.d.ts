declare module "webdfu" {
  export class DFU {
    static appIDLE: number;
    static appDETACH: number;
    static dfuIDLE: number;
    static findDeviceDfuInterfaces: (device: USBDevice) => any;
  }

  namespace DFU {
    export class Device {
      constructor(device: USBDevice, interfaces: any);
      open: () => Promise<void>;
      detach: () => Promise<void>;
      getState: () => Promise<number>;

      do_upload: (transferSize: number) => Promise<ArrayBuffer>;
      do_download: (transferSize: number, bytes: ArrayBuffer, materialize: boolean) => Promise<void>;
    }
  }
}
