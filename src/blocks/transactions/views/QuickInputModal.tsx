'use client';

import React from 'react';
import { VoiceInputModal } from '@/blocks/voice-input';

interface QuickInputModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickInputModal: React.FC<QuickInputModalProps> = ({ isOpen, onClose }) => {
  return (
    <VoiceInputModal
      isOpen={isOpen}
      onClose={onClose}
      initialMode="manual"
    />
  );
};
