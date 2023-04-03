import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Crossword } from './src/Crossword';

export default function App() {
  return (
    <SafeAreaProvider>
      <Crossword />
    </SafeAreaProvider>
  );
}
