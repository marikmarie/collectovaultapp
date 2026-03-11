import React, { useState } from 'react';
import { SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import AddCashModal from '@/components/AddCashModal';

export default function AddCashScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(true);

  const handleClose = () => {
    setModalVisible(false);
    setTimeout(() => {
      router.back();
    }, 300);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <AddCashModal
        visible={modalVisible}
        onClose={handleClose}
      />
    </SafeAreaView>
  );
}
