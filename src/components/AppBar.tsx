import React, { useState } from "react";
import { HashRouter, Redirect, Route, Link } from "react-router-dom";

import { Theme, WithStyles, createStyles, withStyles } from "@material-ui/core/styles";

import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import Drawer from "@material-ui/core/Drawer";

import List from "@material-ui/core/List";
import Divider from "@material-ui/core/Divider";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";

import IconButton from "@material-ui/core/IconButton";
import MenuIcon from "@material-ui/icons/Menu";

import { useBluetooth } from "../services/Bluetooth";

import Page from "../pages";
import DevicePage from "../pages/Device";
import InputPage from "../pages/Input";
import GundamPage from "../pages/Gundam";
import SettingsPage from "../pages/Settings";
import UpdatePage from "../pages/Update";
import AboutPage from "../pages/About";

const drawerWidth = 240;

const styles = (theme: Theme) => createStyles({
  root: {
    flexGrow: 1,
  },
  flex: {
    flex: 1,
  },
  drawerPaper: {
    position: "relative",
    width: drawerWidth,
  },
  menuButton: {
    marginLeft: -12,
    marginRight: 20,
  },
  toolbarMargin: theme.mixins.toolbar,
  aboveDrawer: {
    zIndex: theme.zIndex.drawer + 1,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
});

const routes: (Page | undefined)[] = [
  new DevicePage(),
  undefined,
  new InputPage(),
  new GundamPage(),
  new SettingsPage(),
  undefined,
  new UpdatePage(),
  undefined,
  new AboutPage(),
];

const AppBarComponent = (props: WithStyles<typeof styles>) => {
  const [drawer, setDrawer] = useState(false);
  const [bt] = useBluetooth();

  const toggleDrawer = () => {
    setDrawer(!drawer);
  };

  const onItemClick = () => {
    setDrawer(false);
  };

  const title_routes: JSX.Element[] = [];
  const button_routes: JSX.Element[] = [];

  const drawer_entries: JSX.Element[] = [];
  const page_routes: JSX.Element[] = [];

  routes.forEach((page) => {
    if (page == undefined) {
      drawer_entries.push(<Divider/>);
      return;
    }

    const enabled = page.enabled(bt.activeDevice);

    const title_component: React.FC = () => <React.Fragment>{page.title}</React.Fragment>;

    // @ts-ignore
    title_routes.push(<Route exact path={page.path} component={title_component}/>);

    const Page = page.page;
    page_routes.push(
      // @ts-ignore
      <Route exact path={page.path}>
        {!enabled ?
          <
            // @ts-ignore
            Redirect to="/"/
          > :
          <
            // @ts-ignore
            Page
          />
        }
      </Route>
    );
    if (page.button !== undefined) {
      // @ts-ignore
      button_routes.push(<Route exact path={page.path} component={page.button}/>);
    }

    const Icon = page.icon;
    const Title = title_component;

    drawer_entries.push(
      <ListItem button component={Link} to={page.path} onClick={onItemClick} disabled={!enabled}>
        <ListItemIcon><Icon /></ListItemIcon>
        <ListItemText><Title/></ListItemText>
      </ListItem>
    );
  });

  const { classes } = props;
  return (
    // @ts-ignore
    <HashRouter>
      <AppBar className={classes.aboveDrawer}>
        <Toolbar>
          <IconButton
            className={classes.menuButton}
            color="inherit"
            aria-label="Menu"
            onClick={toggleDrawer}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            color="inherit"
            className={classes.flex}
          >
            {title_routes}
          </Typography>
          {button_routes}
        </Toolbar>
      </AppBar>

      <div className={classes.toolbarMargin} />
      <Drawer
        variant="temporary"
        open={drawer}
        onClose={toggleDrawer}
        classes={{paper: classes.drawerPaper}}
      >
        <List>
          {drawer_entries}
        </List>
      </Drawer>
      <main className={classes.content} style={{height: "calc(100% - 64px)"}}>
        {page_routes}
      </main>
    </HashRouter>
  );
}

export default withStyles(styles)(AppBarComponent);
