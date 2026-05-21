import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App";

const HAWKEYE_GREY = {
  main: "#5c5c5c",
  dark: "#454545",
  light: "#7a7a7a",
  contrastText: "#ffffff"
};

const theme = createTheme({
  palette: {
    mode: "light",
    primary: HAWKEYE_GREY
  },
  components: {
    MuiAppBar: {
      defaultProps: {
        color: "primary"
      }
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          "&:hover": {
            backgroundColor: HAWKEYE_GREY.dark
          }
        }
      }
    }
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
