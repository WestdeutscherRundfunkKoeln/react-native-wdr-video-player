import { Dimensions } from 'react-native';

export const RECIPROCAL_PAGE_RATIO = 0.5625; //9 : 16

export const checkSource = (uri) => {
  return typeof uri === 'string' ?
    { source: { uri } } : { source: uri }
};


export const getWinWidth = () => {
  return Dimensions.get('window').width < Dimensions.get('window').height ?
  Dimensions.get('window').width : Dimensions.get('window').height;
};

export const getWinHeight = () => {
  return Dimensions.get('window').width < Dimensions.get('window').height ?
  Dimensions.get('window').height : Dimensions.get('window').width;
};

export const getInlineHeight = () => {
  return getWinWidth() * RECIPROCAL_PAGE_RATIO;
};


export const debug = (props, title, objekt) => {
  if (props.debug) {
      console.log(`-----> Player debug -> ${title}: ${JSON.stringify(objekt)}`);
  }
};
