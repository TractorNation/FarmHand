import Impact from "../assets/fonts/impact.ttf";
import Antonio from "../assets/fonts/Antonio-VariableFont_wght.ttf";
import Baskervville from "../assets/fonts/Baskervville-VariableFont_wght.ttf";
import LibreBaskervville from "../assets/fonts/LibreBaskerville-Regular.ttf";
import Anton from '../assets/fonts/Anton-Regular.ttf'


const Fonts = {
  components: {
    MuiCssBaseline: {
      styleOverrides: `
      @font-face {
        font-family: "Impact";
        src: url(${Impact}) format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: "Antonio";
        src: url(${Antonio}) format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: "Baskervville";
        src: url(${Baskervville}) format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: "Libre Baskervville";
        src: url(${LibreBaskervville}) format('ttf');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      },

      @font-face {
        font-family: "Anton";
        src: url(${Anton}) format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }`,
    },
  },
};

export default Fonts;
