import React from "react";

import SettingsIcon from "@material-ui/icons/Settings";

import Page from ".";
import type { DeviceState } from "../services/Bluetooth";

export default class SettingsPage implements Page {
  title = "Settings";
  path = "/settings";

  icon = SettingsIcon;

  enabled(device?: DeviceState): boolean {
    return device != undefined && device.services.settings != undefined;
  }

  page: React.FC = () => {
    return (
      <React.Fragment/>
    );
  }
}
