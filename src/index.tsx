import React from "react";
import ReactDOM from "react-dom";

import { SnackbarProvider } from "notistack";

import CssBaseline from "@material-ui/core/CssBaseline";

import AppBar from "./components/AppBar";
import { fetchReleases } from "./services/Releases";

function App() {
  return (
    <
      // @ts-ignore
      SnackbarProvider maxSnack={3}
    >
      <CssBaseline />
      <
        // @ts-ignore
        AppBar
      />
    </SnackbarProvider>
  );
}

fetchReleases().finally(() => {
  ReactDOM.render(<App />, document.getElementById("root"));
});
