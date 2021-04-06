import React from "react";

import globalHook, { Store } from "use-global-hook";

import { getReleases, getNightlyVersion, downloadRelease } from "../services/Releases";

export type DeviceState = {
  device: HIDDevice,
  version: string,
};

type HIDState = {
  activeDevice: DeviceState | null;
  snackbar: any | null,

  operating: boolean,
}

type HIDActions = {
  setSnackbarCallbacks: (cbs: any) => void;

  connect: () => Promise<void>;
  disconnect: () => Promise<void>;

  provision: (bytes: ArrayBuffer) => Promise<void>;
}

const initialState: HIDState = {
  activeDevice: null,
  snackbar: null,
  operating: false,
};

async function findDevice(vendorId: number, productId: number): Promise<HIDDevice> {
  for (const device of await navigator.hid.getDevices()) {
    if (device.vendorId == vendorId && device.productId == productId) {
      return Promise.resolve(device);
    }
  }

  throw "Device not found.";
}

function toast(store: Store<HIDState, HIDActions>, message: string, toastType?: string) {
  store.state.snackbar.closeSnackbar();
  return store.state.snackbar.enqueueSnackbar(message, { variant: toastType });
}

const actions = {
  setSnackbarCallbacks: (store: Store<HIDState, HIDActions>, snackbar: any) => {
    if (store.state.snackbar == null) {
      store.setState({ ...store.state, snackbar });
    }
  },

  connect: async (store: Store<HIDState, HIDActions>) => {
    const passinglink = { vendorId: 0x1209, productId: 0x214c };
    const hori = { vendorId: 0x0f0d, productId: 0x0092 };

    try {
      let devices = await navigator.hid.requestDevice({ filters: [passinglink, hori] });

      console.log(devices);
      if (!devices || devices.length == 0) {
        return Promise.reject("No device found");
      }

      let device = devices[0];

      await device.open();

      let version_bytes = await device.receiveFeatureReport(0x40);
      let decoder = new TextDecoder("utf-8");
      let version = decoder.decode(version_bytes);

      store.setState({ ...store.state, activeDevice: { device, version } });
      return Promise.resolve();
    } catch (err) {
      const msg = `Failed to connect to HID device: ${err}`;
      console.log(msg);
      console.log(err.stack);
      return Promise.reject(msg);
    }
  },

  disconnect: (store: Store<HIDState, HIDActions>) => {
    if (store.state.activeDevice == null) {
      return;
    }

    store.state.activeDevice.device.close();
    store.setState({ ...store.state, activeDevice: null });
  },

  provision: async (store: Store<HIDState, HIDActions>, bytes: ArrayBuffer) => {
    if (store.state.activeDevice == null) {
      return Promise.reject("No device connected.");
    }

    store.setState({...store.state, operating: true });
    const device = store.state.activeDevice.device;

    toast(store, `Provisioning with ${bytes.byteLength} bytes...`);

    for (let i = 0; i < bytes.byteLength / 62; ++i) {
      let offset = i * 62;
      let bytes_left = Math.min(62, bytes.byteLength - offset);
      console.log(`Writing chunk: bytes [${offset}, ${offset + bytes_left})`);
      let slice = new Uint8Array(bytes.slice(offset, offset + bytes_left));
      let output = new Uint8Array(1 + bytes_left);
      output[0] = i;
      for (let j = 0; j < slice.byteLength; ++j) {
        output[j + 1] = slice[j];
      }

      await device.sendFeatureReport(0x43, output.buffer);
    }

    let magic = Uint32Array.from([0x1209214c]);
    await device.sendFeatureReport(0x44, magic.buffer);

    toast(store, `Done provisioning, rebooting...`);
    let reboot = Uint8Array.from([1]);
    try {
      await device.sendFeatureReport(0x41, reboot.buffer);
    } catch (err) {
      // Expected, the device reboots immediately.
    }

    actions.disconnect(store);
    return Promise.resolve();
  },
}

export const useHID = globalHook<HIDState, HIDActions>(React, initialState, actions);
