import React from "react";

import Button from "@material-ui/core/Button";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import SystemUpdateIcon from "@material-ui/icons/SystemUpdate";

import { useFilePicker } from "react-sage";
import { useSnackbar } from "notistack";

import Page from ".";
import type { DeviceState } from "../services/Bluetooth";

import { useDFU } from "../services/DFU";
import { getReleases, getNightlyDate, getNightlyVersion } from "../services/Releases";

export default class UpdatePage implements Page {
  title = "Firmware Update";
  path = "/update";

  icon = SystemUpdateIcon;

  enabled(device?: DeviceState): boolean {
    return true;
  }

  button: React.FC = () => {
    const [state, actions] = useDFU();
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
    const [state, actions] = useDFU();
    const {files, onClick: showFilePicker, HiddenFileInput} = useFilePicker({
      maxFileSize: 1 * 1024 * 1024,
    });

    const releases = getReleases();
    const release = releases.length > 0 ? releases[releases.length - 1] : null;

    const onUpload = (blob: Blob) => {
      blob.arrayBuffer().then(bytes => actions.flash(bytes));
    };

    const onUploadRelease = (release: string) => () => {
      const board = state.activeDevice!.device.productName!;
      actions.downloadAndFlash(release, board);
    };

    const onUploadFile = () => {
      showFilePicker();
    };

    React.useEffect(() => {
      if (files!.length == 1) {
        onUpload(files![0]);
      }
    }, [files]);

    const onDownload = () => {
      const beginTime = new Date().getTime();
      const result = actions.fetch();
      result.then(blob => {
        const duration = new Date().getTime() - beginTime;
        console.log(`Fetched in ${blob.size} bytes in ${duration}ms`);
        enqueueSnackbar("Succesfully downloaded image", { variant: "success" });

        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute("download", "pl.bin");
        link.click();
      }).catch(err => {
        enqueueSnackbar(`Failed to download image: ${err}`);
        console.log(`Failed to download image: ${err}`);
        console.log(err.stack);
      });
    };

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
              primary="Serial number"
              secondary={haveDevice ? state.activeDevice!.device.serialNumber : "N/A"}
            />
          </ListItem>
          <ListItem button onClick={onUploadRelease(release!)} disabled={disableActions}>
            <ListItemText
              primary="Flash latest release"
              secondary={
                `Flash the latest released version: v${release!}`
              }
            />
          </ListItem>
          <ListItem button onClick={onUploadRelease("nightly")} disabled={disableActions}>
            <ListItemText
              primary="Flash latest nightly"
              secondary={
                `Flash the latest nightly version: ${getNightlyVersion()} (${getNightlyDate()})`
              }
            />
          </ListItem>

          <ListItem button onClick={onUploadFile} disabled={disableActions}>
            <ListItemText primary="Flash from file" secondary={"Flash a specific file"}/>
          </ListItem>
          <ListItem button onClick={onDownload} disabled={disableActions}>
            <ListItemText primary="Dump firmware" secondary={"Download the device's current firmware"}/>
          </ListItem>
        </List>
        <HiddenFileInput multiple={false}/>
      </React.Fragment>
    );
  }
}
