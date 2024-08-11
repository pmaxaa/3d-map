import { createTheme } from '@mui/material/styles';
import "./App.css";

const theme = createTheme({
    palette: {
      primary: {
        light: '#757ce8',
        main: '#28be46',
        dark: '#049c31',
        contrastText: '#fff',
      },
      secondary: {
        light: '#7b7b7b',
        main: '#262626',
        dark: '#000000',
        contrastText: '#fff',
      },
      success: {
        light: '#fed850',
        main: '#ffb700',
        dark: '#ff7300',
        contrastText: '#fff',
      },
    },
    typography: {
        fontfamily: "Sirius",
    }
});

export default theme;