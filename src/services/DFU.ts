import React from "react";

import { DFU } from "webdfu";
import globalHook, { Store } from "use-global-hook";

import { getReleases, getNightlyVersion, downloadRelease } from "../services/Releases";

type DeviceState = {
  device: USBDevice,
  dfu: DFU.Device;
};

type DFUState = {
  activeDevice: DeviceState | null;
  snackbar: any | null,

  operating: boolean,
}

type DFUActions = {
  setSnackbarCallbacks: (cbs: any) => void;

  connect: () => Promise<void>;
  disconnect: () => Promise<void>;

  fetch: () => Promise<Blob>;

  flash: (bytes: ArrayBuffer) => Promise<void>;
  downloadAndFlash: (release: string, board: string) => Promise<void>;
}

const initialState: DFUState = {
  activeDevice: null,
  snackbar: null,
  operating: false,
};

async function findDevice(vendorId: number, productId: number, serialNumber: string): Promise<USBDevice> {
  for (const device of await navigator.usb.getDevices()) {
    if (device.vendorId == vendorId && device.productId == productId && device.serialNumber == serialNumber) {
      return Promise.resolve(device);
    }
  }

  throw "Device not found.";
}

function toast(store: Store<DFUState, DFUActions>, message: string, toastType?: string) {
  store.state.snackbar.closeSnackbar();
  return store.state.snackbar.enqueueSnackbar(message, { variant: toastType });
}

const actions = {
  setSnackbarCallbacks: (store: Store<DFUState, DFUActions>, snackbar: any) => {
    if (store.state.snackbar == null) {
      store.setState({ ...store.state, snackbar });
    }
  },

  connect: async (store: Store<DFUState, DFUActions>) => {
    const vendorId = 0x1209;
    const productId = 0x214d;
    const filter = { vendorId, productId };

    try {
      let device = await navigator.usb.requestDevice({ filters: [filter] });

      await device.open();

      const dfuInterfaces = DFU.findDeviceDfuInterfaces(device);
      if (dfuInterfaces.length == 0) {
        return Promise.reject("Failed to find DFU interface");
      } else if (dfuInterfaces.length > 1) {
        return Promise.reject("Found multiple DFU interfaces");
      }

      let dfu = new DFU.Device(device, dfuInterfaces[0]);
      await dfu.open();

      // Transition to dfuIDLE, which might require a USB reset.
      let state = await dfu.getState();
      if (state == DFU.appIDLE) {
        await dfu.detach();
        if (await dfu.getState() != DFU.appDETACH) {
          return Promise.reject("DFU state not appDETACH after detaching");
        }
      }

      state = await dfu.getState();
      if (state == DFU.appDETACH) {
        try {
          await device.reset();
        } catch (err) {
          console.log(`USB reset failed: ${err}`);
          console.log("Continuing anyway...");
          await new Promise(r => setTimeout(r, 1000));
        }

        const start = new Date().getTime();
        while (new Date().getTime() - start < 2000) {
          device = await findDevice(vendorId, productId, device.serialNumber!);
          if (device != null) {
            await new Promise(r => setTimeout(r, 1000));
            break;
          }
        }

        if (device == null) {
          return Promise.reject("Failed to find device after USB reset");
        }

        dfu = new DFU.Device(device, dfuInterfaces[0]);
        await dfu.open();

        if (await dfu.getState() != DFU.dfuIDLE) {
          return Promise.reject("DFU state not dfuIDLE after resetting");
        }
      }

      store.setState({ ...store.state, activeDevice: { device, dfu }});
      return Promise.resolve();
    } catch (err) {
      const msg = `Failed to connect to DFU device: ${err}`;
      console.log(msg);
      console.log(err.stack);
      return Promise.reject(msg);
    }
  },

  disconnect: (store: Store<DFUState, DFUActions>) => {
    if (store.state.activeDevice == null) {
      return;
    }

    store.state.activeDevice.device.close();
    store.setState({ ...store.state, activeDevice: null });
  },

  fetch: async (store: Store<DFUState, DFUActions>) => {
    if (store.state.activeDevice == null) {
      return Promise.reject("No device connected.");
    }

    store.setState({...store.state, operating: true });
    const dfu = store.state.activeDevice.dfu;

    // TODO: Use the actual wTransferSize value.
    return await dfu.do_upload(4096).finally(() => {
      store.setState({...store.state, operating: false });
    });
  },

  flash: async (store: Store<DFUState, DFUActions>, bytes: ArrayBuffer) => {
    if (store.state.activeDevice == null) {
      return Promise.reject("No device connected.");
    }

    store.setState({...store.state, operating: true });
    const dfu = store.state.activeDevice.dfu;

    toast(store, `Flashing ${bytes.byteLength} bytes...`);
    // TODO: Use the actual wTransferSize value.
    return await dfu.do_download(4096, bytes, false).catch(err => {
      if (err.message.startsWith("Error during reset for manifestation")) {
        // USB reset failed, but the flash still succeeded.
        return;
      }

      toast(store, `Failed to flash: ${err}`, "error");
      throw err;
    }).then(() => {
      toast(store, "Successfully flashed!", "success");
    }).finally(() => {
      store.setState({...store.state, operating: false });
      actions.disconnect(store);
    });
  },

  downloadAndFlash: async (store: Store<DFUState, DFUActions>, release: string, board: string) => {
    store.setState({...store.state, operating: true });

    toast(store, `Downloading release "${release}" for board ${board}`);
    const data = await downloadRelease(release, board);
    return await actions.flash(store, data);
  },
}

export const useDFU = globalHook<DFUState, DFUActions>(React, initialState, actions);
