import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  createTheme,
  ThemeProvider,
} from "@mui/material";

const theme = createTheme({
  palette: {
    primary: {
      main: "#0216b0",
    },
    success: {
      main: "#4caf50",
    },
    error: {
      main: "#f44336",
    },
  },
});

const Layout = ({ children }) => {
  return (
    <ThemeProvider theme={theme}>
      <div
        style={{ backgroundColor: "rgb(163, 196, 229)", minHeight: "100vh" }}
      >
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h5" component="div">
              VideoCensor
            </Typography>
          </Toolbar>
        </AppBar>
        {children}
      </div>
    </ThemeProvider>
  );
};

export default Layout;
