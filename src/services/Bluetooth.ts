import React from "react";

import globalHook, { Store } from "use-global-hook";

type BluetoothServiceInfo = {
  uuid: string;
  characteristics?: {
    [name: string]: string,
  };
};

const services: { [index: string]: BluetoothServiceInfo } = {
  version: {
    uuid: "1209214d-246d-2815-27c6-f57dad450000",
    characteristics: {
      version: "1209214d-246d-2815-27c6-f57dad450001",
      branch: "1209214d-246d-2815-27c6-f57dad450002",
      commit: "1209214d-246d-2815-27c6-f57dad450003",
    },
  },

  input: {
    uuid: "1209214d-246d-2815-27c6-f57dad450100",
    characteristics: {
      input: "1209214d-246d-2815-27c6-f57dad450101",
    },
  },

  settings: {
    uuid: "1209214d-246d-2815-27c6-f57dad450200",
  },

  gundam: {
    uuid: "1209214d-246d-2815-27c6-f57dad452800",
    characteristics: {
      camera: "1209214d-246d-2815-27c6-f57dad452801",
      reset: "1209214d-246d-2815-27c6-f57dad452802",
    },
  },
};

type BluetoothService = {
  service: BluetoothRemoteGATTService,
  characteristics: Map<string, BluetoothRemoteGATTCharacteristic>,
}

type BluetoothServices = {
  [index: string]: BluetoothService | undefined,
  version: BluetoothService | undefined,
  input: BluetoothService | undefined,
  gundam: BluetoothService | undefined,
  settings: BluetoothService | undefined,
};

export type DeviceState = {
  device: BluetoothDevice,
  version: string,
  services: BluetoothServices,
};

type BluetoothState = {
  activeDevice: DeviceState | undefined,
  snackbar: any | undefined,
}

type BluetoothActions = {
  setSnackbarCallbacks: (cbs: any) => void;

  connect: () => Promise<string>;
  disconnect: () => void;
  setInputState: (inputs: ArrayBuffer) => Promise<boolean>;
  setCamera: (index: number) => Promise<boolean>;
  resetCamera: (index: number) => Promise<boolean>;
}

const initialState: BluetoothState = {
  activeDevice: undefined,
  snackbar: undefined,
};

async function readGatt(device_state: DeviceState, service: string, characteristic: string): Promise<DataView | undefined> {
  if (device_state == undefined) {
    console.log(`Failed to read ${service}:${characteristic}: no device`);
    return Promise.resolve(undefined);
  }

  if (device_state.services[service] == undefined) {
    console.log(`Failed to read ${service}:${characteristic}: service missing`);
    return Promise.resolve(undefined);
  }

  const characteristics = device_state.services[service]?.characteristics;
  if (characteristics == undefined || !characteristics.has(characteristic)) {
    console.log(`Failed to read ${service}:${characteristic}: characteristic missing`);
    return Promise.resolve(undefined);
  }

  try {
    return characteristics.get(characteristic)!.readValue();
  } catch (err) {
    console.log(`Failed to read ${service}:${characteristic}: ${err}`);
    return Promise.resolve(undefined);
  }
}

async function readGattUTF8(device_state: DeviceState, service: string, characteristic: string): Promise<string | undefined> {
  const bytes = await readGatt(device_state, service, characteristic);
  if (bytes == undefined) {
    return Promise.resolve(undefined);
  }
  return Promise.resolve(new TextDecoder().decode(bytes.buffer));
}

type QueuedWrite = {
  characteristic: BluetoothRemoteGATTCharacteristic;
  data: ArrayBuffer;
  attempts: number;
  submitTime: number;
  resolve: (success: boolean) => void;
  reject: (err: Error) => void;
};
const writeQueue: Array<QueuedWrite> = [];
let writeInFlight = false;

function writeGatt(device_state: DeviceState, service: string, characteristic: string, data: ArrayBuffer): Promise<boolean> {
  if (device_state == undefined) {
    console.log(`Failed to write ${service}:${characteristic}: no device`);
    return Promise.resolve(false);
  }

  if (device_state.services[service] == undefined) {
    console.log(`Failed to write ${service}:${characteristic}: service missing`);
    return Promise.resolve(false);
  }

  const characteristics = device_state.services[service]?.characteristics;
  if (characteristics == undefined || !characteristics.has(characteristic)) {
    console.log(`Failed to write ${service}:${characteristic}: characteristic missing`);
    return Promise.resolve(false);
  }

  const submit = () => {
    if (writeQueue.length == 0) {
      return;
    }

    const write = writeQueue[0];
    const result = write.characteristic.writeValue(write.data);
    result.then(() => {
      write.resolve(true);

      console.log(`Write finished after ${new Date().getTime() - write.submitTime}ms`);
      writeQueue.shift();
      if (writeQueue.length == 0) {
        writeInFlight = false;
      } else {
        submit();
      }
    }).catch((error) => {
      // Retry a few times.
      if (write.attempts++ < 2) {
        return submit();
      } else {
        console.log(`Bluetooth write failed: ${error}`);
        write.reject(error);

        writeQueue.shift();
        if (writeQueue.length == 0) {
          writeInFlight = false;
        } else {
          return submit();
        }
      }
    });
  };

  return new Promise((resolve, reject) => {
    writeQueue.push({
      characteristic: characteristics.get(characteristic)!,
      data,
      attempts: 0,
      submitTime: new Date().getTime(),
      resolve,
      reject,
    });

    if (!writeInFlight) {
      writeInFlight = true;
      submit();
    }
  });
}

const actions = {
  setSnackbarCallbacks: (store: Store<BluetoothState, BluetoothActions>, snackbar: any) => {
    if (store.state.snackbar == undefined) {
      store.setState({ ...store.state, snackbar });
    }
  },

  connect: async (store: Store<BluetoothState, BluetoothActions>) => {
    // @ts-ignore
    const service_uuids = Object.keys(services).map(key => services[key].uuid);

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: service_uuids.map(uuid => ({ services: [uuid] })),
      });

      await device.gatt!.connect();

      const device_state: DeviceState = {
        device,
        version: "unknown",
        services:{
          version: undefined,
          input: undefined,
          gundam: undefined,
          settings: undefined,
        },
      };

      for (const service_name in services) {
        // @ts-ignore
        const service_info: BluetoothServiceInfo = services[service_name];
        const characteristics = service_info.characteristics;
        try {
          const service = await device.gatt!.getPrimaryService(service_info.uuid);
          device_state.services[service_name] = {
            service,
            characteristics: new Map(),
          };

          console.log(`Found service ${service_name}`);

          for (const char_name in characteristics) {
            const char_uuid = characteristics[char_name];
            try {
              const c = await service.getCharacteristic(char_uuid);
              device_state.services[service_name]!.characteristics.set(char_name, c);
            } catch (err) {
              console.log(`Service ${service_name} doesn't have characteristic '${char_name}' (${char_uuid})`);
            }
          }
        } catch (err) {
          console.log(`Failed to find service ${service_name} (${service_info.uuid}): ${err}`);
        }
      }

      const version = await readGattUTF8(device_state, "version", "version");
      if (version != undefined) {
        device_state.version = version;
      }

      store.state.snackbar.closeSnackbar();
      store.state.snackbar.enqueueSnackbar("Connected!", {variant: "success"});

      store.setState({ ...store.state, activeDevice: device_state });
    } catch (err) {
      store.state.snackbar.enqueueSnackbar("Failed to connect: " + err, { variant: "error" });
      console.log("Bluetooth connect failed: " + err);
    }
  },

  disconnect: (store: Store<BluetoothState, BluetoothActions>) => {
    if (store.state.activeDevice != undefined) {
      store.state.activeDevice.device.gatt!.disconnect();
    }

    store.state.snackbar.closeSnackbar();
    store.state.snackbar.enqueueSnackbar("Disconnected.");
    store.setState({ ...store.state, activeDevice: undefined });
  },

  setInputState: async (store: Store<BluetoothState, BluetoothActions>, inputs: ArrayBuffer): Promise<boolean> => {
    if (store.state.activeDevice == undefined) {
      store.state.snackbar.enqueueSnackbar("No connected device.", { variant: "error" });
      return Promise.resolve(false);
    }

    if (!await writeGatt(store.state.activeDevice, "input", "input", inputs)) {
      store.state.snackbar.enqueueSnackbar("Failed to write input.", { variant: "error" });
      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  },

  setCamera: async (store: Store<BluetoothState, BluetoothActions>, index: number): Promise<boolean> => {
    if (store.state.activeDevice == undefined) {
      store.state.snackbar.enqueueSnackbar("No connected device.", { variant: "error" });
      return Promise.resolve(false);
    }

    const buffer = new ArrayBuffer(1);
    new DataView(buffer).setUint8(0, index);

    if (!await writeGatt(store.state.activeDevice, "gundam", "camera", buffer)) {
      store.state.snackbar.enqueueSnackbar("Failed to write input.", { variant: "error" });
      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  },

  resetCamera: async (store: Store<BluetoothState, BluetoothActions>, index: number): Promise<boolean> => {
    if (store.state.activeDevice == undefined) {
      store.state.snackbar.enqueueSnackbar("No connected device.", { variant: "error" });
      return Promise.resolve(false);
    }

    const buffer = new ArrayBuffer(1);
    new DataView(buffer).setUint8(0, index);

    if (!await writeGatt(store.state.activeDevice, "gundam", "reset", buffer)) {
      store.state.snackbar.enqueueSnackbar("Failed to write input.", { variant: "error" });
      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  },
}

export const useBluetooth = globalHook<BluetoothState, BluetoothActions>(React, initialState, actions);
