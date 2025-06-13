import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen 
        name="_tokenizacion" 
        options={{ 
          title: 'Tokenizacion',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="payment" color={color} size={size} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="_yape" 
        options={{ 
          title: 'Yape',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="android" color={color} size={size} />
          ),
        }} 
      />
       <Tabs.Screen 
        name="_izipay" 
        options={{ 
          title: 'IziPay',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="android" color={color} size={size} />
          ),
        }} 
      />
      
    </Tabs>
  );
}
