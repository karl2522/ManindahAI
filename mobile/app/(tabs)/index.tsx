import { View, Text, StyleSheet } from 'react-native';

export default function TabsIndex() {
  return (
    <View style={styles.container}>
      <Text>Welcome to ManindahAI Dashboard!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
