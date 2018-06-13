import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';

const backgroundColor = 'rgba(255, 255, 255, 0.7)';
const imgSource = require('../assets/img/icoPlayVideo.png');

const styles = StyleSheet.create({
  playButton: {
    opacity: 0.9,
    height: 35,
    width: 35
  },
  playContainer: {
    flex: 1,
    backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
    height: 75,
    width: 75
  }
});

const StyledPlayButton = props => (
  <View style={styles.playContainer}>
    <TouchableOpacity
      onPress={() => props.onPress()}
    >
      <Image style={styles.playButton} source={imgSource} resizeMode='contain' />
    </TouchableOpacity>
  </View>
);

StyledPlayButton.propTypes = {
  onPress: PropTypes.func.isRequired
};

export { StyledPlayButton };
