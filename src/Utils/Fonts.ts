import Baskervville from "../assets/fonts/Baskervville-VariableFont_wght.ttf";
import Anton from "../assets/fonts/Anton-Regular.ttf";
import Antonio from "../assets/fonts/Antonio-VariableFont_wght.ttf";
import Nasalization from '../assets/fonts/Nasalization_Rg.otf'
import Fredoka from '../assets/fonts/Fredoka.ttf';

export const anton = {
  fontFamily: "Anton",
  fontStyle: "normal",
  fontDisplay: "swap",
  src: `
    local('Anton'),
    url(${Anton}) format('truetype')
  `,
};

export const antonio = {
  fontFamily: "Antonio",
  fontStyle: "normal",
  fontDisplay: "swap",
  src: `
    local('Antonio'),
    url(${Antonio}) format('truetype')
  `,
};

export const baskervville = {
  fontFamily: "baskervville",
  fontStyle: "normal",
  fontDisplay: "swap",
  src: `
    local('Baskervville'),
    url(${Baskervville}) format('truetype')
  `,
};

export const nasalization = {
  fontFamily: "Nasalization",
  fontStyle: "normal",
  fontDisplay: "swap",
  src: `
    local('Nasalization'),
    url(${Nasalization}) 
  `,
};

export const fredoka = {
  fontFamily: "Fredoka",
  fontStyle: "normal",
  fontDisplay: "swap",
  src: `
    local('Fredoka'),
    url(${Fredoka}) 
  `,
}
