import React, { useState } from 'react';
import { SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import TransferCashModal from '@/components/TransferCashModal';

export default function TransferCashScreen() {
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
      <TransferCashModal
        visible={modalVisible}
        onClose={handleClose}
      />
    </SafeAreaView>
  );
}
