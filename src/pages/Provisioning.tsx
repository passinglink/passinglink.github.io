import React from "react";

import Button from "@material-ui/core/Button";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import VpnKeyIcon from "@material-ui/icons/VpnKey";

import { useFilePicker } from "react-sage";
import { useSnackbar } from "notistack";

import Page from ".";

import { useHID } from "../services/HID";
import type { DeviceState } from "../services/Bluetooth";

export default class ProvisioningPage implements Page {
  title = "Provision";
  path = "/provision";

  icon = VpnKeyIcon;

  enabled(device?: DeviceState): boolean {
    return true;
  }

  button: React.FC = () => {
    const [state, actions] = useHID();
    const {enqueueSnackbar} = useSnackbar();

    actions.setSnackbarCallbacks(useSnackbar());

    const connect = () => {
      actions.connect().then(() => {
        enqueueSnackbar("USB device connected!", { variant: "success" });
      }).catch(err => {
        enqueueSnackbar(err, { variant: "error" });
      });
    }

    const disconnect = () => {
      actions.disconnect();
    };

    if (state.activeDevice == null) {
      return <Button color="inherit" onClick={connect}>Connect</Button>;
    } else {
      return <Button color="inherit" onClick={disconnect}>Disconnect</Button>;
    }
  }

  page: React.FC = () => {
    const {enqueueSnackbar} = useSnackbar();
    const [state, actions] = useHID();
    const {files, onClick: showFilePicker, HiddenFileInput} = useFilePicker({
      maxFileSize: 1 * 1024 * 1024,
    });

    const onUpload = (blob: Blob) => {
      blob.arrayBuffer().then(bytes => actions.provision(bytes));
    };

    const onUploadFile = () => {
      showFilePicker();
    };

    React.useEffect(() => {
      if (files!.length == 1) {
        onUpload(files![0]);
      }
    }, [files]);

    const haveDevice = state.activeDevice != null;
    const disableActions = !haveDevice || state.operating;
    return (
      <React.Fragment>
        <List>
          <ListItem>
            <ListItemText
              primary="Device name"
              secondary={haveDevice ? state.activeDevice!.device.productName : "No device connected"}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Version"
              secondary={haveDevice ? state.activeDevice!.version : "N/A" }
            />
          </ListItem>
          <ListItem button onClick={onUploadFile} disabled={disableActions}>
            <ListItemText primary="Provision" secondary={"Provision a device from file"}/>
          </ListItem>
        </List>
        <HiddenFileInput multiple={false}/>
      </React.Fragment>
    );
  }
}
