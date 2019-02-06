import React, { PureComponent } from 'react';
import { Image, StyleSheet, View, Dimensions } from 'react-native';
import PropTypes from 'prop-types';


export class PreviewImage extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      image: props.imageSource,
      imageStyle: props.imageStyle
    };
    this.defaultImage = require('../assets/img/logoWdrDefault.png');
    this.imgFetchFailed = this.imgFetchFailed.bind(this);
  }



  componentDidUpdate(prevProps) {
    if (prevProps.imageSource !== this.props.imageSource) {
      this.setState({ image: { uri: this.props.imageSource, cache: 'force-cache' } });
    }
  }

  /*
    Im Fehlerfall wird Image auf null gesetzt, damit die
    Render-Methode das Default-Image rendert.
  */
  imgFetchFailed(err) {
    this.setState({ image: null });
  }

  render() {
    const imageSource = this.state.image;

    let source = null;
    let style = null;
    if (imageSource) {
      if (typeof imageSource === 'string'){
        source = { uri: imageSource, cache: 'force-cache' };
      }
    } else {
      source = this.defaultImage;
    }
    return (
        <Image
          style={this.state.imageStyle}
          source={source}
          onError={this.imgFetchFailed}
          resizeMode="contain"
        />
    );
  }
}

PreviewImage.propTypes = {
  imageStyle: Image.propTypes.style,
};

PreviewImage.defaultProps = {
  imageStyle: {}
};
