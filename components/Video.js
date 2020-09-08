import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  BackHandler,
  Animated,
  Image,
  Alert,
  Platform,
  View
} from 'react-native'
import VideoPlayer from 'react-native-video'
import KeepAwake from 'react-native-keep-awake'
import Orientation from 'react-native-orientation-locker'
import Icons from 'react-native-vector-icons/MaterialIcons'
import { Controls } from './'
import { PreviewImage } from './PreviewImage'
import {
  checkSource,
  getWinWidth,
  getWinHeight,
  getInlineHeight,
  getSmallSide,
  RECIPROCAL_PAGE_RATIO,
  debug
} from './utils'
import AudioPlayer from './AudioPlayer'
const Win = Dimensions.get('window');
const backgroundColor = '#000';

const styles = StyleSheet.create({
  background: {
    backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 98
  },
  fullScreen: {
    ...StyleSheet.absoluteFillObject
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    zIndex: 99
  },
  previewImage:{
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    // height: 215,
    // justifyContent: 'center',
    // alignItems: 'center'
  }
});

const defaultTheme = {
  title: '#FFF',
  more: '#FFF',
  center: '#FFF',
  fullscreen: '#FFF',
  volume: '#FFF',
  scrubberThumb: '#FFF',
  scrubberBar: '#FFF',
  seconds: '#FFF',
  duration: '#FFF',
  progress: '#FFF',
  loading: '#FFF',
  settings: '#FFF',
  error: '#FFF',
  background: '#000',
  buttonBackground: '#FFF'
};

class Video extends Component {
  constructor(props) {
    super(props);
    this.state = {
      paused: props.playbackConfig === 'autoplay' ? false : true,
      preLoad: props.playbackConfig === 'postload' ? false : true,
      newInstance: true,
      muted: false,
      fullScreen: false,
      inlineHeight: getInlineHeight(),
      loading: false,
      duration: 0,
      progress: 0,
      currentTime: 0,
      seeking: false,
      renderError: false,
      minimized: false,
    };
    this.startPos = props.startPos;
    debug(props, 'Constructor', {...this.state, startPos: this.startPos});

    this.animInline = new Animated.Value(getInlineHeight());
    this.animFullscreen = new Animated.Value(getInlineHeight());
    this.BackHandler = this.BackHandler.bind(this);
    this.onRotated = this.onRotated.bind(this)
  }



  componentDidMount() {
    //Dimensions.addEventListener('change', this.onRotated);
    BackHandler.addEventListener('hardwareBackPress', this.BackHandler)
  }

  componentWillUnmount() {
    //Dimensions.removeEventListener('change', this.onRotated);
    BackHandler.removeEventListener('hardwareBackPress', this.BackHandler)
  }

  onLoadStart(payload) {
    debug(this.props, 'onLoadStart', payload);
    this.setState({ /*paused: true,*/ loading: true })
  }

  onLoad(data) {
    debug(this.props, 'onLoad', data);
    this.setStartPos();
    if (!this.state.loading) return;
    this.props.onLoad(data);
    const { height, width } = data.naturalSize;
    const ratio = height === 'undefined' && width === 'undefined' ?
      RECIPROCAL_PAGE_RATIO : (height / width);
    const inlineHeight = this.props.lockRatio ?
      (getWinWidth() / this.props.lockRatio)
      : (getWinWidth() * ratio);
    debug(this.props, 'onLoad inlineHeight', inlineHeight);
    this.setState({
      loading: false,
      inlineHeight,
      duration: data.duration
    }, () => {
      Animated.timing(this.animInline, { toValue: inlineHeight, duration: 200 }).start();
      this.props.onPlay(!this.state.paused);
      if (!this.state.paused) {
        KeepAwake.activate();
        if (this.props.fullScreenOnly) {
          this.setState({ fullScreen: true }, () => {
            this.props.onFullScreen(this.state.fullScreen);
            this.animToFullscreen(getSmallSide());
            if (this.props.rotateToFullScreen) Orientation.lockToLandscape()
          })
        }
      }
    })
  }

  onLoadAudio(data) {
    debug(this.props, 'onLoadAudio', data);
    if (!this.state.loading) return;
    this.setState({
      paused: false,
      loading: false,
      duration: data.duration
    });
  }

  // onBuffer() {
  //   // console.log('buffering')
  //   this.setState({ loading: true, paused: true })
  // }

  onEnd() {
    debug(this.props, 'onEnd', '');
    this.props.onEnd();
    const { loop, minimized } = this.props;
    if (!loop) this.pause();
    this.onSeekRelease(0);
    this.setState({ currentTime: 0 }, () => {
      if (!loop && !minimized) this.controls.showControls()
    })
  }

  onFullScreenCallback() {
    this.props.onFullScreen(this.state.fullScreen);
  }

  onRotated({ window: { width, height } }) {
    debug(this.props, 'onRotated', { window: { width, height } });
    // Add this condition incase if inline and fullscreen options are turned on
    if (this.props.inlineOnly) return;
    const orientation = width > height ? 'LANDSCAPE' : 'PORTRAIT';
    if (this.props.rotateToFullScreen) {
      if (orientation === 'LANDSCAPE') {
        debug(this.props, 'onRotated LANDSCAPE height', getSmallSide());
        this.setState({ fullScreen: true }, () => {
          this.animToFullscreen(getSmallSide());
          this.props.onFullScreen(this.state.fullScreen)
        });
        return
      }
      if (orientation === 'PORTRAIT') {
        this.setState({
          fullScreen: false,
          paused: this.props.fullScreenOnly || this.state.paused
        }, () => {
          this.animToInline();
          if (this.props.fullScreenOnly) this.props.onPlay(!this.state.paused);
          this.props.onFullScreen(this.state.fullScreen)
        });
        return
      }
    } else {
      this.animToInline()
    }
    if (this.state.fullScreen) this.animToFullscreen(getSmallSide())
  ;}

  onSeekRelease(percent) {
    debug(this.props, 'onSeekRelease', percent);
    const seconds = percent * this.state.duration;
    this.setState({ progress: percent, seeking: false }, () => {
      this.player.seek(seconds)
    })
  }

  onError(msg) {
    debug(this.props, 'onError', msg);
    this.props.onError(msg);
    const { error } = this.props;
    this.setState({ renderError: true }, () => {
      let type;
      switch (true) {
        case error === false:
          type = error;
          break;
        case typeof error === 'object':
          type = Alert.alert(error.title, error.message, error.button, error.options);
          break;
        default:
          type = Alert.alert('Oops!', 'There was an error playing this video, please try again later.', [{ text: 'Close' }]);
          break
      }
      return type
    })
  }

  BackHandler() {
    if (this.state.fullScreen) {
      this.setState({ fullScreen: false }, () => {
        this.animToInline();
        this.props.onFullScreen(this.state.fullScreen);
        if (this.props.fullScreenOnly && !this.state.paused) this.togglePlay();
        if (this.props.rotateToFullScreen) Orientation.lockToPortrait();
        setTimeout(() => {
          if (!this.props.lockPortraitOnFsExit) Orientation.unlockAllOrientations()
        }, 1500)
      });
      return true
    }
    return false
  }

  pause() {
    if (!this.state.paused) this.togglePlay()
  }

  play() {
    if (this.state.paused) this.togglePlay()
  }

  toggleAudioPlay() {
    this.setState({ paused: !this.state.paused }, () => {
     this.props.onPlay(!this.state.paused);
    });
  }

  setStartPos() {
      if ( this.startPos !== 0 ) {
        debug(this.props, 'setStartPos', this.startPos);
        const startPosNum = Number(this.startPos);
        this.player.seek(startPosNum);
        this.startPos = 0;
      }
  }

  togglePlay() {
    debug(this.props, 'togglePlay', '');
    this.setState({ paused: !this.state.paused, preLoad: true }, () => {
      this.props.onPlay(!this.state.paused);
      Orientation.getOrientation((e, orientation) => {
        if (this.props.togglePlayCB) {
          this.props.togglePlayCB();
        }
        if (this.props.inlineOnly) return;
        if (!this.state.paused) {
          if (this.props.fullScreenOnly && !this.state.fullScreen) {
            this.setState({ fullScreen: true }, () => {
              this.props.onFullScreen(this.state.fullScreen);
              const initialOrient = Orientation.getInitialOrientation();
              const height = orientation !== initialOrient ?
                Win.width : Win.height;
              this.animToFullscreen(height);
              if (this.props.rotateToFullScreen) Orientation.lockToLandscape()
            })
          }
          KeepAwake.activate()
        } else {
          KeepAwake.deactivate()
        }
      })
    })
  }

  toggleFS() {
    this.setState({ fullScreen: !this.state.fullScreen }, () => {
      Orientation.getOrientation((e, orientation) => {
        if (this.state.fullScreen) {
          const initialOrient = Orientation.getInitialOrientation();
          const height = orientation !== initialOrient ?
            Win.width : Win.height;
            this.props.onFullScreen(this.state.fullScreen);
            if (this.props.rotateToFullScreen) Orientation.lockToLandscape();
            this.animToFullscreen(getSmallSide());
        } else {
          if (this.props.fullScreenOnly) {
            this.setState({ paused: true }, () => this.props.onPlay(!this.state.paused))
          }
          this.props.onFullScreen(this.state.fullScreen);
          if (this.props.rotateToFullScreen) Orientation.lockToPortrait();
          this.animToInline();
          setTimeout(() => {
            if (!this.props.lockPortraitOnFsExit) Orientation.unlockAllOrientations()
          }, 1500)
        }
      })
    })
  }

  animToFullscreen(height) {
    debug(this.props, 'animToFullscreen height', height );
    Animated.parallel([
      Animated.timing(this.animFullscreen, { toValue: height, duration: 200 }),
      Animated.timing(this.animInline, { toValue: height, duration: 200 })
    ]).start()
  }

  animToInline(height) {
    debug(this.props, 'animToInline height', height )
    const newHeight = height || this.state.inlineHeight
    Animated.parallel([
      Animated.timing(this.animFullscreen, { toValue: newHeight, duration: 100 }),
      Animated.timing(this.animInline, { toValue: this.state.inlineHeight, duration: 100 })
    ]).start()
  }

  toggleMute() {
    this.setState({ muted: !this.state.muted });
    if (this.props.storeMute) {
      this.props.storeMute();
    }
  }

  seek(percent) {
    const currentTime = percent * this.state.duration;
    this.setState({ seeking: true, currentTime })
  }

  seekTo(seconds) {
    const percent = seconds / this.state.duration;
    if (seconds > this.state.duration) {
      throw new Error(`Current time (${seconds}) exceeded the duration ${this.state.duration}`);
      return false
    }
    return this.onSeekRelease(percent)
  }

  progress(time) {
    const { currentTime } = time;
    const progress = currentTime / this.state.duration;
    if (!this.state.seeking) {
      this.setState({ progress, currentTime }, () => {
        this.props.onProgress(time)
      })
    }
  }

  renderError() {
    const { fullScreen } = this.state;
    const inline = {
      height: this.animInline,
      alignSelf: 'stretch'
    };
    const textStyle = { color: 'white', padding: 10 };

    return (
      <Animated.View
        style={[styles.background, fullScreen ? styles.fullScreen : inline]}
      >
        <Text style={textStyle}>Retry</Text>
        <Icons
          name="replay"
          size={60}
          color={this.props.theme.error}
          onPress={() => this.setState({ renderError: false })}
        />
      </Animated.View>
    )
  }

  onAudioBecomingNoisy() {
    debug(this.props, 'onAudioBecomingNoisy', '');
    if (!this.state.paused) this.togglePlay();
  }

  renderVideoPlayer() {
    const {
      fullScreen,
      paused,
      muted,
      loading,
      progress,
      duration,
      inlineHeight,
      currentTime
    } = this.state;

    const {
      url,
      loop,
      title,
      rate,
      style,
      volume,
      onTimedMetadata,
      resizeMode,
      playInBackground,
      playWhenInactive,
      allowsExternalPlayback,
      audioOnly,
      ignoreSilentSwitch,
      progressUpdateInterval,
      selectedAudioTrack,
      selectedTextTrack,
      stereoPan,
      textTracks,
      useTextureView,
      bufferConfig,
    } = this.props;

    const inline = {
      height: inlineHeight,
      alignSelf: 'stretch'
    };


    const trackInformation =
          Platform.OS === 'android' ?
          {
            textTracks: textTracks,
            selectedTextTrack: selectedTextTrack
          }
          :
          {
            selectedTextTrack: selectedTextTrack
          }
    debug(this.props, 'renderVideoPlayer trackInformation = ', {...trackInformation, url: url });
    return (
        <VideoPlayer
          ref={(ref) => { this.player = ref }}
          {...checkSource(url)}
          allowsExternalPlayback={allowsExternalPlayback}
          audioOnly={audioOnly}
          bufferConfig={bufferConfig}
          ignoreSilentSwitch={ignoreSilentSwitch}
          muted={muted}
          paused={paused}
          playInBackground={playInBackground} // Audio continues to play when app entering background.
          playWhenInactive={playWhenInactive} // [iOS] Video continues to play when control or notification center are shown.
          progressUpdateInterval={progressUpdateInterval} // [iOS] Interval to fire onProgress (default to ~250ms)
          rate={rate}
          repeat={loop}
          resizeMode={resizeMode}
          selectedAudioTrack={selectedAudioTrack}
          stereoPan={stereoPan}
          useTextureView={useTextureView}
          volume={volume}
          style={fullScreen ? styles.fullScreen : inline}

          onAudioBecomingNoisy={() => this.onAudioBecomingNoisy()}
          onLoadStart={(e) => this.onLoadStart(e)} // Callback when video starts to load
          onLoad={e => this.onLoad(e)} // Callback when video loads
          onProgress={e => this.progress(e)} // Callback every ~250ms with currentTime
          onEnd={() => this.onEnd()}
          onError={e => this.onError(e)}
          // onBuffer={() => this.onBuffer()} // Callback when remote video is buffering
          onTimedMetadata={e => onTimedMetadata(e)} // Callback when the stream receive some metadata
          {...trackInformation}
        />
    );

  }

  renderPreviewImage(previewImage, style) {
    debug(this.props, 'renderPreviewImage', '');
    if (this.state.loading === true) {
      return null;
    }
    else {
      return(
        <PreviewImage
          imageSource={previewImage}
          imageStyle={style}
        />
      );
    }
  }



  renderPlayer() {
    const {
      fullScreen,
      newInstance,
      paused,
      muted,
      loading,
      progress,
      duration,
      inlineHeight,
      currentTime
    } = this.state;

    const {
      url,
      loop,
      title,
      logo,
      rate,
      style,
      volume,
      placeholder,
      theme,
      onTimedMetadata,
      resizeMode,
      onMorePress,
      inlineOnly,
      minimized,
      playInBackground,
      playWhenInactive,
      onSettingsPress,
      alternatePlayBtn,
      mediaType,
      allowsExternalPlayback,
      audioOnly,
      ignoreSilentSwitch,
      progressUpdateInterval,
      selectedAudioTrack,
      selectedTextTrack,
      stereoPan,
      textTracks,
      useTextureView,
      bufferConfig,
      playbackConfig,
      previewImage,
      rotateToFullScreen,
      fullScreenOnly
    } = this.props;
    const inline = {
      height: inlineHeight,
      alignSelf: 'stretch'
    };

    const setTheme = {
      ...defaultTheme,
      ...theme
    };

    const showMore = textTracks && textTracks.length > 0 ? true : false;

    return (
      <Animated.View
        style={[
          styles.background,
          fullScreen ?
            (styles.fullScreen, { height: this.animFullscreen })
            : { height: this.animInline },
          fullScreen ? null : style,
          fullScreen && rotateToFullScreen ? { width: getWinHeight()} : { width: getWinWidth()}
        ]}
      >
        { <StatusBar hidden={fullScreen} /> }
        {
          (loading || currentTime < 0.01 || mediaType === 'audio') &&
            this.renderPreviewImage(previewImage, styles.image)
        }
        {
          (this.state.preLoad === true) &&
           this.renderVideoPlayer()
        }
        <Controls
          ref={(ref) => { this.controls = ref }}
          toggleMute={() => this.toggleMute()}
          toggleFS={() => this.toggleFS()}
          togglePlay={() => this.togglePlay()}
          paused={paused}
          muted={muted}
          fullscreen={fullScreen}
          //fullScreenOnly={fullScreenOnly}
          fullScreenOnly={false}
          loading={loading}
          onSeek={val => this.seek(val)}
          onSeekRelease={pos => this.onSeekRelease(pos)}
          progress={progress}
          currentTime={currentTime}
          duration={duration}
          logo={logo}
          title={title}
          more={showMore}
          onMorePress={() => onMorePress()}
          theme={setTheme}
          minimized={minimized}
          settings={!!onSettingsPress}
          onSettingsPress={() => onSettingsPress()}
          alternatePlayBtn={alternatePlayBtn}
          mediaType={mediaType}
        />
      </Animated.View>
    )
  }

  renderMinimizedPlayer(renderError) {
    const { paused, muted, loading, progress, duration, currentTime } = this.state;
    const { url, loop, title, logo, rate, style, volume, placeholder, theme,
      onTimedMetadata, resizeMode, onMorePress, inlineOnly, minimized,
      playInBackground, playWhenInactive, onSettingsPress, onClosePress,
      progressUpdateInterval, alternatePlayBtn, mediaType } = this.props;
    const inline = {
      height: 150,
      alignSelf: 'stretch'
    };

    const setTheme = {
      ...defaultTheme,
      ...theme
    };

    const audioplayerStyle = {
      flexDirection: 'row',
      alignSelf: 'stretch',
      height: style.height,
      padding: style.padding,
    };
    debug(this.props, 'renderMinimizedPlayer', url);
    return (
      <View style={ style } >
        <VideoPlayer
          {...checkSource(url)}
          paused={paused}
          resizeMode={resizeMode}
          repeat={loop}
          style={inline}
          ref={(ref) => { this.player = ref }}
          rate={rate}
          volume={volume}
          muted={muted}
          playInBackground={playInBackground} // Audio continues to play when app entering background.
          playWhenInactive={playWhenInactive} // [iOS] Video continues to play when control or notification center are shown.
          progressUpdateInterval={progressUpdateInterval}          // [iOS] Interval to fire onProgress (default to ~250ms)
          onLoadStart={() => this.onLoadStart()} // Callback when audio starts to load
          onLoad={e => this.onLoadAudio(e)} // Callback when audio loads
          onProgress={e => { this.progress(e); }} // Callback every ~250ms with currentTime
          onEnd={() => this.onEnd()}
          onError={e => this.onError(e)}
          // onBuffer={() => this.onBuffer()} // Callback when remote video is buffering
          onTimedMetadata={e => onTimedMetadata(e)} // Callback when the stream receive some metadata
        />
        <AudioPlayer
              style={audioplayerStyle}
              barFillColor={'rgb(0, 115, 121)'}
              barBackgroundColor={'rgb(255, 255, 255)'}
              buttonBackgroundColor={'rgb(255, 255, 255)'}
              onClosePress={onClosePress}
              progress={progress}
              theme={setTheme}
              currentTime={currentTime}
              duration={duration}
              togglePlay={() => this.toggleAudioPlay()}
              paused={paused}
              loading={loading}
              onSeek={val => this.seek(val)}
              onSeekRelease={pos => this.onSeekRelease(pos)}
              onPressRetry={() => this.setState({ renderError: false })}
              renderError={renderError}
        />
      </View>
    )
  }



  render() {
    if (this.props.minimized) {
      return this.renderMinimizedPlayer(this.state.renderError);
    }
    if (this.state.renderError) return this.renderError()
    return this.renderPlayer()
  }
}

Video.propTypes = {
  url: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]).isRequired,
  placeholder: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  style: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.number
  ]),
  error: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.object
  ]),
  loop: PropTypes.bool,
  debug: PropTypes.bool,
  playbackConfig: PropTypes.oneOf(['autoplay', 'preload', 'postload']),
  previewImage: PropTypes.string,
  inlineOnly: PropTypes.bool,
  minimized: PropTypes.bool,
  fullScreenOnly: PropTypes.bool,
  playInBackground: PropTypes.bool,
  playWhenInactive: PropTypes.bool,
  rotateToFullScreen: PropTypes.bool,
  lockPortraitOnFsExit: PropTypes.bool,
  onEnd: PropTypes.func,
  onLoad: PropTypes.func,
  onPlay: PropTypes.func,
  onError: PropTypes.func,
  onProgress: PropTypes.func,
  onMorePress: PropTypes.func,
  onFullScreen: PropTypes.func,
  onTimedMetadata: PropTypes.func,
  rate: PropTypes.number,
  volume: PropTypes.number,
  lockRatio: PropTypes.number,
  logo: PropTypes.string,
  title: PropTypes.string,
  theme: PropTypes.object,
  resizeMode: PropTypes.string,
  storeMute: PropTypes.func,
  togglePlayCB: PropTypes.func,
  onSettingsPress: PropTypes.func,
  alternatePlayBtn: PropTypes.bool,
  mediaType: PropTypes.oneOf(['video', 'audio']),
  allowsExternalPlayback: PropTypes.bool,
  audioOnly: PropTypes.bool,
  bufferConfig: PropTypes.shape({
    minBufferMs: PropTypes.number,
    maxBufferMs: PropTypes.number,
    bufferForPlaybackMs: PropTypes.number,
    bufferForPlaybackRebufferMs: PropTypes.number
  }),
  ignoreSilentSwitch: PropTypes.string,
  progressUpdateInterval: PropTypes.number,
  selectedAudioTrack: PropTypes.shape({
    type: PropTypes.string,
    value: PropTypes.string
  }),
  selectedTextTrack: PropTypes.shape({
    type: PropTypes.string,
    value: PropTypes.string
  }),
  stereoPan: PropTypes.number,
  textTracks: PropTypes.array,
  useTextureView: PropTypes.bool
};

Video.defaultProps = {
  debug: false,
  placeholder: undefined,
  style: {},
  error: true,
  loop: false,
  playbackConfig: 'preload',
  previewImage: '',
  inlineOnly: false,
  minimized: false,
  fullScreenOnly: false,
  playInBackground: false,
  playWhenInactive: false,
  rotateToFullScreen: false,
  lockPortraitOnFsExit: false,
  onEnd: () => {},
  onLoad: () => {},
  onPlay: () => {},
  onError: () => {},
  onProgress: () => {},
  onMorePress: undefined,
  onFullScreen: () => {},
  onTimedMetadata: () => {},
  rate: 1,
  volume: 1,
  lockRatio: undefined,
  logo: '',
  title: '',
  theme: defaultTheme,
  resizeMode: 'contain',
  onSettingsPress: undefined,
  alternatePlayBtn: false,
  mediaType: 'video',
  allowsExternalPlayback: true,
  audioOnly: false,
  bufferConfig: {
    minBufferMs: 15000,
    maxBufferMs: 50000,
    bufferForPlaybackMs: 2500,
    bufferForPlaybackAfterRebufferMs: 5000
  },
  ignoreSilentSwitch: 'obey',
  progressUpdateInterval: 1000.0,
  selectedAudioTrack: {
    type: '',
    value: ''
  },
  selectedTextTrack: {
    type: '',
    value: ''
  },
  stereoPan: 0.0,
  textTracks: [],
  useTextureView: false,
  startPos: 0,
};

export default Video
