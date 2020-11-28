import React from "react";

import Button from "@material-ui/core/Button";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Typography from "@material-ui/core/Typography";
import BluetoothSearchingIcon from "@material-ui/icons/BluetoothSearching";

import { useSnackbar } from "notistack";
import { useBluetooth } from "../services/Bluetooth";
import type { DeviceState } from "../services/Bluetooth";

import Page from ".";

export default class DevicePage implements Page {
  title = "Device";
  path = "/";

  icon = BluetoothSearchingIcon;

  enabled(device?: DeviceState): boolean {
    return true;
  }

  button: React.FC = () => {
    const [state, actions] = useBluetooth();
    actions.setSnackbarCallbacks(useSnackbar());

    if (state.activeDevice == undefined) {
      return <Button color="inherit" onClick={() => actions.connect()}>Connect</Button>;
    } else {
      return <Button color="inherit" onClick={() => actions.disconnect()}>Disconnect</Button>;
    }
  }

  page: React.FC = () => {
    const [state] = useBluetooth();

    if (state.activeDevice == undefined) {
      return <Typography variant="h6">No device connected</Typography>;
    }
    return (
      <React.Fragment>
        <List>
          <ListItem>
            <ListItemText primary="Device name" secondary={state.activeDevice.device.name}/>
          </ListItem>
          <ListItem>
            <ListItemText primary="ID" secondary={state.activeDevice.device.id}/>
          </ListItem>
          <ListItem>
            <ListItemText primary="Version" secondary={state.activeDevice.version}/>
          </ListItem>
        </List>
      </React.Fragment>
    );
  }
}
