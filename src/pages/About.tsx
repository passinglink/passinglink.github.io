import React from "react";

import HelpIcon from "@material-ui/icons/Help";
import Typography from "@material-ui/core/Typography";

import Page from ".";
import type { DeviceState } from "../services/Bluetooth";

export default class AboutPage implements Page {
  title = "About";
  path = "/about";

  icon = HelpIcon;

  enabled(device?: DeviceState): boolean {
    return true;
  }

  page: React.FC = () => {
    return (
      <Typography paragraph>
        DualShock 4 SVG: modified from <a href="https://commons.wikimedia.org/wiki/File:Dualshock_4_Layout.svg">original</a> by Tokyoship, Wikimedia Commons (<a href="https://creativecommons.org/licenses/by/3.0/deed.en">CC BY 3.0</a>)
      </Typography>
    );
  }
}
