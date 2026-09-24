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
    const exampleBtn = screen.getByText(/Добавь в смету Анны Смирновой 2 обвода трубы/i);
    fireEvent.click(exampleBtn);

    expect(textarea.value).toContain('Добавь в смету Анны Смирновой 2 обвода трубы');
  });

  it('sends text query and renders added, updated, replaced, removed items and delta', async () => {
    const mockResult: aiEstimateApi.AiEstimateResultDto = {
      orderId: 101,
      orderNumber: 'ORD-101',
      clientName: 'Анна Смирнова',
      success: true,
      aiMessage: 'Смета обновлена для заказа №ORD-101',
      addedTotalCost: 1500,
      totalCostDelta: 2400,
      addedItems: [
        {
          materialName: 'Обвод трубы',
          quantity: 2,
          unit: 'шт',
          salePrice: 300
        }
      ],
      updatedItems: [
        {
          materialName: 'Кабель ВВГнг',
          oldQuantity: 10,
          newQuantity: 25,
          unit: 'м',
          costDelta: 1200
        }
      ],
      replacedItems: [
        {
          oldMaterialName: 'Полотно MSD',
          newMaterialName: 'Полотно Bauf 205',
          quantity: 20,
          unit: 'кв.м',
          costDelta: 1500
        }
      ],
      removedItems: [
        {
          materialName: 'Светильник точечный',
          quantity: 2,
          unit: 'шт',
          refundCost: 600
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
    fireEvent.change(textarea, { target: { value: 'Обнови смету' } });

    const sendBtn = screen.getByRole('button', { name: /Отправить в смету/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(aiEstimateApi.requestAiEstimateText).toHaveBeenCalledWith({
        orderId: undefined,
        query: 'Обнови смету',
        prompt: 'Обнови смету'
      });
    });

    // Check results
    expect(await screen.findByText('Заказ №ORD-101 — Анна Смирнова')).toBeInTheDocument();
    expect(screen.getByText(/Смета обновлена для заказа/i)).toBeInTheDocument();
    expect(screen.getByText('Обвод трубы')).toBeInTheDocument();
    expect(screen.getByText('Кабель ВВГнг')).toBeInTheDocument();
    expect(screen.getByText(/Полотно MSD/i)).toBeInTheDocument();
    expect(screen.getByText(/Полотно Bauf 205/i)).toBeInTheDocument();
    expect(screen.getByText('Светильник точечный')).toBeInTheDocument();
    expect(screen.getByText('Краска')).toBeInTheDocument();
    expect(screen.getByText('Неизвестный материал')).toBeInTheDocument();
    expect(screen.getByText(/Изменение суммы сметы:/i)).toBeInTheDocument();
    expect(screen.getByText(/\+2[\s\u00A0]?400/)).toBeInTheDocument();

    // Click on "Перейти в карточку заказа"
    const openOrderBtn = screen.getByRole('button', { name: /Перейти в карточку заказа/i });
    fireEvent.click(openOrderBtn);
    expect(useOrderDrawerStore.getState().isOpen).toBe(true);
    expect(useOrderDrawerStore.getState().orderId).toBe(101);
    expect(useOrderDrawerStore.getState().activeTab).toBe('CONTRACT');
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
