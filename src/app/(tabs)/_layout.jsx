import { Tabs } from 'expo-router';
import { Image } from 'react-native';

function TabIcon({ source, focused }) {
  return (
    <Image source={source} style={{width: 28,height: 28}} resizeMode="contain"/>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',

        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen name="index"
        options={{title: 'Find Bunks',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={require('../../../assets/images/petrol-maps/3d-navigation.png')} focused={focused}/>
          ),
        }}
      />

      <Tabs.Screen name="favorites"
        options={{
          title: 'Sales',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={require('../../../assets/images/petrol-maps/advertising.png')} focused={focused}/>
          ),
        }}
      />

      <Tabs.Screen name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={require('../../../assets/images/petrol-maps/3d-setting.png')} focused={focused}/>
          ),
        }}
      />
    </Tabs>
  );
}