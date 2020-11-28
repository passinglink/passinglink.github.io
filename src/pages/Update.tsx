import React from "react";

import SystemUpdateIcon from "@material-ui/icons/SystemUpdate";

import Page from ".";
import type { DeviceState } from "../services/Bluetooth";

export default class UpdatePage implements Page {
  title = "Firmware Update";
  path = "/update";

  icon = SystemUpdateIcon;

  enabled(device?: DeviceState): boolean {
    return false;
  }

  page: React.FC = () => {
    return (
      <React.Fragment/>
    );
  }
}
