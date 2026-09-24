import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiEstimateModal } from './AiEstimateModal';
import * as aiEstimateApi from '../../../api/aiEstimate';

vi.mock('../../../api/aiEstimate', () => ({
  requestAiEstimateText: vi.fn(),
  requestAiEstimateVoice: vi.fn()
}));

vi.mock('../../../hooks/useAudioRecorder', () => ({
  useAudioRecorder: () => ({
    isRecording: false,
    recordingTime: 0,
    audioBlob: null,
    audioUrl: null,
    error: null,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    resetRecording: vi.fn()
  })
}));

describe('AiEstimateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<AiEstimateModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText('AI-Смета из остатков склада')).not.toBeInTheDocument();
  });

  it('renders modal with order info when isOpen is true', () => {
    render(
      <AiEstimateModal
        isOpen={true}
        onClose={() => {}}
        orderId={10}
        orderNumber="101"
        clientName="Иван Иванов"
      />
    );

    expect(screen.getByText('AI-Смета из остатков склада')).toBeInTheDocument();
    expect(screen.getByText('№101')).toBeInTheDocument();
    expect(screen.getByText(/Иван Иванов/)).toBeInTheDocument();
    expect(screen.getByText('Голосовой ввод')).toBeInTheDocument();
    expect(screen.getByText('Текстовый ввод')).toBeInTheDocument();
  });

  it('switches between voice and text tabs', () => {
    render(
      <AiEstimateModal
        isOpen={true}
        onClose={() => {}}
        orderId={10}
      />
    );

    // Default tab is VOICE
    expect(screen.getByText('Нажмите на микрофон для записи')).toBeInTheDocument();

    // Switch to TEXT tab
    fireEvent.click(screen.getByText('Текстовый ввод'));
    expect(screen.getByPlaceholderText(/В заказ 101 добавь/i)).toBeInTheDocument();
    expect(screen.getByText('Наполнить смету через AI')).toBeInTheDocument();
  });

  it('submits text prompt and displays agent results', async () => {
    const mockResult: aiEstimateApi.AiEstimateResultDto = {
      orderId: 10,
      orderNumber: '101',
      clientName: 'Иван',
      addedMaterials: [
        { materialId: 1, materialName: 'Профиль стеновой', quantity: 5, unit: 'м.п.', salePrice: 200 }
      ],
      shortageMaterials: [
        {
          materialId: 2,
          materialName: 'Светильник GX53',
          requestedQuantity: 10,
          availableQuantity: 4,
          addedQuantity: 4,
          shortageQuantity: 6,
          unit: 'шт.'
        }
      ],
      missingMaterials: [
        { materialName: 'Лента подсветки', reason: 'Нет в наличии' }
      ],
      aiMessage: 'В смету добавлен профиль стеновой. По светильникам дефицит 6 шт.',
      success: true
    };

    (aiEstimateApi.requestAiEstimateText as any).mockResolvedValueOnce(mockResult);

    const onEstimateApplied = vi.fn();
    const onClose = vi.fn();

    render(
      <AiEstimateModal
        isOpen={true}
        onClose={onClose}
        orderId={10}
        onEstimateApplied={onEstimateApplied}
      />
    );

    // Switch to text tab
    fireEvent.click(screen.getByText('Текстовый ввод'));

    const textarea = screen.getByPlaceholderText(/В заказ 101 добавь/i);
    fireEvent.change(textarea, { target: { value: 'Добавь 5 профилей и 10 светильников' } });

    const submitBtn = screen.getByText('Наполнить смету через AI');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(mockResult.aiMessage)).toBeInTheDocument();
    });

    expect(screen.getByText('Профиль стеновой')).toBeInTheDocument();
    expect(screen.getByText('Светильник GX53')).toBeInTheDocument();
    expect(screen.getByText('Лента подсветки')).toBeInTheDocument();

    // Click apply and close
    const applyBtn = screen.getByText('Применить и закрыть');
    fireEvent.click(applyBtn);

    expect(onEstimateApplied).toHaveBeenCalledWith(mockResult);
    expect(onClose).toHaveBeenCalled();
  });
});
