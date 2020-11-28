import React, { MouseEvent }  from "react";

import Button from "@material-ui/core/Button";
import Flexbox from "flexbox-react";
import SwitchCameraIcon from "@material-ui/icons/SwitchCamera";

import Page from ".";

import { useBluetooth } from "../services/Bluetooth";
import type { DeviceState } from "../services/Bluetooth";

export default class GundamPage implements Page {
  title = "Spectator Camera";
  path = "/gundam";

  icon = SwitchCameraIcon;

  enabled(device?: DeviceState): boolean {
    return device != undefined && device.services.gundam != undefined;
  }

  page: React.FC = () => {
    const [state, actions] = useBluetooth();

    const onClick = (id: number) => (event: MouseEvent) => {
      if (event.shiftKey) {
        console.log("shift click");
        actions.resetCamera(id);
      } else {
        actions.setCamera(id);
      }
    };

    const padding = "5px";
    const margin = "5px";
    return (
      <Flexbox flexDirection="column" style={{height: "100%"}}>
        <Flexbox flexDirection="row" flexGrow={2} style={{padding: padding}}>
          <Button onClick={onClick(1)} variant="contained" fullWidth={true} style={{margin: margin}}>Player 1</Button>
          <Button onClick={onClick(3)} variant="contained" fullWidth={true} style={{margin: margin}}>Player 3</Button>
        </Flexbox>
        <Flexbox flexDirection="row" flexGrow={2} style={{padding: padding}}>
          <Button onClick={onClick(2)} variant="contained" fullWidth={true} style={{margin: margin}}>Player 2</Button>
          <Button onClick={onClick(4)} variant="contained" fullWidth={true} style={{margin: margin}}>Player 4</Button>
        </Flexbox>
        <Flexbox flexDirection="row" flexGrow={1} style={{padding: padding}}>
          <Button onClick={onClick(7)} variant="contained" fullWidth={true} style={{margin: margin}}>Team 1</Button>
          <Button onClick={onClick(8)} variant="contained" fullWidth={true} style={{margin: margin}}>Team 2</Button>
        </Flexbox>

        <Flexbox flexDirection="row" flexGrow={1} style={{padding: padding}}>
          <Button onClick={onClick(5)} variant="contained" fullWidth={true} style={{margin: margin}}>Map view</Button>
        </Flexbox>

        <Flexbox flexDirection="row" flexGrow={1} style={{padding: padding}}>
          <Button onClick={onClick(6)} variant="contained" fullWidth={true} style={{margin: margin}}>Split screen</Button>
        </Flexbox>

        <Flexbox flexDirection="row" flexGrow={1} style={{padding: padding}}>
          <Button onClick={onClick(9)} variant="contained" fullWidth={true} style={{margin: margin}}>Dynamic</Button>
        </Flexbox>
      </Flexbox>
    );
  }
}
