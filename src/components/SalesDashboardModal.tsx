import React from 'react';
import { Modal } from 'react-native';
import SalesDashboard from './SalesDashboard';

interface SalesDashboardModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SalesDashboardModal: React.FC<SalesDashboardModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SalesDashboard showBack={true} />
    </Modal>
  );
};

export default SalesDashboardModal;
