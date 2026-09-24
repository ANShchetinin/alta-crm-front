import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiAssistant } from './AiAssistant';
import * as aiEstimateApi from '../api/aiEstimate';
import * as kanbanApi from '../api/kanban';
import { useOrderDrawerStore } from '../store/useOrderDrawerStore';

vi.mock('../api/aiEstimate', () => ({
  requestAiEstimateText: vi.fn(),
  requestAiEstimateVoice: vi.fn()
}));

vi.mock('../api/kanban', () => ({
  getOrders: vi.fn().mockResolvedValue([
    {
      id: 101,
      orderNumber: 'ORD-101',
      clientName: 'Анна Смирнова',
      totalPrice: 15000
    }
  ])
}));

vi.mock('../hooks/useAudioRecorder', () => ({
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

describe('AiAssistant Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header with beta badge and order selector', async () => {
    render(<AiAssistant />);

    expect(screen.getByText('ИИ-Ассистент сметы')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
    expect(screen.getByText(/Голосовое и текстовое наполнение сметы/i)).toBeInTheDocument();
    expect(screen.getByText('Голосовой ввод')).toBeInTheDocument();
    expect(screen.getByText('Текстовый запрос')).toBeInTheDocument();

    await waitFor(() => {
      expect(kanbanApi.getOrders).toHaveBeenCalled();
    });
  });

  it('switches between voice and text tabs and accepts example prompt', () => {
    render(<AiAssistant />);

    const textTabBtn = screen.getByRole('button', { name: /Текстовый запрос/i });
    fireEvent.click(textTabBtn);

    const textarea = screen.getByPlaceholderText(/Добавь в смету Анны Смирновой/i) as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();

    // Click on an example prompt
    const exampleBtn = screen.getByText(/В заказ 1042 добавь 5 шт профиля 60х27/i);
    fireEvent.click(exampleBtn);

    expect(textarea.value).toContain('В заказ 1042 добавь 5 шт профиля 60х27');
  });

  it('sends text query and renders added items, shortages, and order link', async () => {
    const mockResult: aiEstimateApi.AiEstimateResultDto = {
      orderId: 101,
      orderNumber: 'ORD-101',
      clientName: 'Анна Смирнова',
      success: true,
      aiMessage: 'Добавлены обвод трубы и обвод углов',
      addedTotalCost: 1500,
      addedItems: [
        {
          materialName: 'Обвод трубы',
          quantity: 2,
          unit: 'шт',
          salePrice: 300
        },
        {
          materialName: 'Обвод углов',
          quantity: 3,
          unit: 'шт',
          salePrice: 300
        }
      ],
      shortageItems: [
        {
          materialName: 'Краска',
          requestedQuantity: 5,
          availableQuantity: 2,
          shortageQuantity: 3,
          unit: 'банка'
        }
      ],
      missingItems: [
        {
          materialName: 'Неизвестный материал',
          requestedQuantity: 1,
          reason: 'Нет в номенклатуре'
        }
      ]
    };

    (aiEstimateApi.requestAiEstimateText as any).mockResolvedValueOnce(mockResult);

    render(<AiAssistant />);

    const textTabBtn = screen.getByRole('button', { name: /Текстовый запрос/i });
    fireEvent.click(textTabBtn);

    const textarea = screen.getByPlaceholderText(/Добавь в смету Анны Смирновой/i);
    fireEvent.change(textarea, { target: { value: 'Добавь 2 обвода трубы' } });

    const sendBtn = screen.getByRole('button', { name: /Отправить в смету/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(aiEstimateApi.requestAiEstimateText).toHaveBeenCalledWith({
        orderId: undefined,
        query: 'Добавь 2 обвода трубы',
        prompt: 'Добавь 2 обвода трубы'
      });
    });

    // Check results
    expect(await screen.findByText('Заказ №ORD-101 — Анна Смирнова')).toBeInTheDocument();
    expect(screen.getByText(/Добавлены обвод трубы и обвод углов/i)).toBeInTheDocument();
    expect(screen.getByText('Обвод трубы')).toBeInTheDocument();
    expect(screen.getByText('Обвод углов')).toBeInTheDocument();
    expect(screen.getByText('Краска')).toBeInTheDocument();
    expect(screen.getByText('Неизвестный материал')).toBeInTheDocument();

    // Click on "Перейти в карточку заказа"
    const openOrderBtn = screen.getByRole('button', { name: /Перейти в карточку заказа/i });
    fireEvent.click(openOrderBtn);
    expect(useOrderDrawerStore.getState().isOpen).toBe(true);
    expect(useOrderDrawerStore.getState().orderId).toBe(101);
  });

  it('displays error if request fails', async () => {
    (aiEstimateApi.requestAiEstimateText as any).mockRejectedValueOnce(
      new Error('Сетевая ошибка сервера')
    );

    render(<AiAssistant />);

    const textTabBtn = screen.getByRole('button', { name: /Текстовый запрос/i });
    fireEvent.click(textTabBtn);

    const textarea = screen.getByPlaceholderText(/Добавь в смету Анны Смирновой/i);
    fireEvent.change(textarea, { target: { value: 'Тестовый запрос' } });

    const sendBtn = screen.getByRole('button', { name: /Отправить в смету/i });
    fireEvent.click(sendBtn);

    expect(await screen.findByText('Сетевая ошибка сервера')).toBeInTheDocument();
  });
});
