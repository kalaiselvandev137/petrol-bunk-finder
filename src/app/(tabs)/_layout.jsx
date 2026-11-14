import { Ionicons } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

// FuelPay palette
const NAVY = '#0B2559';
const BLUE = '#0A5BFF';
const MINT = '#7DF3E6';
const MUTED = '#8FA3C7';

function TabIcon({ focused, children }) {
  return (
    <View
      style={{
        width: 50,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? BLUE : 'transparent',
      }}
    >
      {children}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: MINT,
        tabBarInactiveTintColor: MUTED,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: NAVY,
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
          borderTopWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <Ionicons name="home" size={20} color={focused ? '#FFFFFF' : MUTED} />
            </TabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="dpdcollection"
        options={{
          title: 'DPD Collection',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <FontAwesome6 name="indian-rupee-sign" size={18} color={focused ? '#FFFFFF' : MUTED} />
            </TabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="fieldupdates"
        options={{
          title: 'Field Updates',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <MaterialIcons name="update" size={22} color={focused ? '#FFFFFF' : MUTED} />
            </TabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <Feather name="settings" size={20} color={focused ? '#FFFFFF' : MUTED} />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}