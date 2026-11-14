import * as SplashScreen from "expo-splash-screen";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

export default function SplashVideo({ onFinish }) {
  const player = useVideoPlayer(
    require("../../assets/images/petrol-maps/FuelPay_splash.mp4"), // your video path
    (p) => {
      p.loop = false;
      p.muted = true;
      p.play();
    }
  );

  useEffect(() => {
    const sub = player.addListener("playToEnd", () => onFinish());
    return () => sub.remove();
  }, [player, onFinish]);

  // Safety net: never get stuck if the video fails to play
  useEffect(() => {
    const t = setTimeout(onFinish, 8000); // a bit longer than your video
    return () => clearTimeout(t);
  }, [onFinish]);

  return (
    <View style={StyleSheet.absoluteFill} className="bg-white p-2">
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
        onLayout={() => SplashScreen.hideAsync()} // hide native splash once video view is ready
      />
    </View>
  );
}