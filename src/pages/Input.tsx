import React from "react";
import { BitView } from "bit-buffer";

import VideogameAssetIcon from "@material-ui/icons/VideogameAsset";

import Page from ".";
import DS4 from "../components/DS4";

import { useBluetooth } from "../services/Bluetooth";
import type { DeviceState } from "../services/Bluetooth";

function buttonToOffset(button: string): number {
  switch (button) {
  case "up":
    return 14;
  case "down":
    return 15;
  case "left":
    return 17;
  case "right":
    return 16;

  case "north":
    return 0;
  case "south":
    return 2;
  case "west":
    return 3;
  case "east":
    return 1;

  case "select":
    return 10;
  case "home":
    return 12;
  case "start":
    return 11;
  case "tp":
    return 13;

  case "l1":
    return 4;
  case "l2":
    return 5;
  case "l3":
    return 6;
  case "r1":
    return 7;
  case "r2":
    return 8;
  case "r3":
    return 9;
  }

  throw(`Unexpected button name ${button}`);
}

export default class InputPage implements Page {
  title = "Remote Input";
  path = "/input";

  icon = VideogameAssetIcon;
  enabled(device?: DeviceState): boolean {
    return device != undefined && device.services.input != undefined;
  }

  page: React.FC = () => {
    const [state, actions] = useBluetooth();

    const writeInputs = (inputs: ArrayBuffer) => {
      actions.setInputState(inputs);
    };

    const onMouseDown = (button: string) => {
      const buffer = new ArrayBuffer(4);
      const bits = new BitView(buffer);
      bits.setBits(buttonToOffset(button), 1, 1);
      writeInputs(buffer);
    };

    const onMouseUp = (button: string) => {
      writeInputs(new ArrayBuffer(4));
    };

    return (
      <DS4
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      />
    );
  }
}
