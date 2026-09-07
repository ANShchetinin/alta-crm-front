import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import { Input } from './Input';
import { FilterPill } from './FilterPill';
import { ConfirmDialog } from './ConfirmDialog';
import { Sheet } from './Sheet';
import { Card } from './Card';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

describe('UI Kit Components', () => {
  describe('Modal', () => {
    it('renders when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Modal Content</p>
        </Modal>
      );
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Test Modal">
          <p>Modal Content</p>
        </Modal>
      );
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('calls onClose when close button clicked', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Test Modal">
          <p>Content</p>
        </Modal>
      );
      const closeBtn = screen.getByLabelText('Закрыть');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Button', () => {
    it('renders text and handles clicks', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Нажми меня</Button>);
      const btn = screen.getByText('Нажми меня');
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled when disabled or loading', () => {
      render(<Button disabled>Отключено</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
    });
  });

  describe('Badge', () => {
    it('renders badge with label and dot', () => {
      render(<Badge variant="success" dot>Активно</Badge>);
      expect(screen.getByText('Активно')).toBeInTheDocument();
    });
  });

  describe('Input', () => {
    it('renders label and handles typing', () => {
      const handleChange = vi.fn();
      render(<Input label="Имя" onChange={handleChange} placeholder="Введите имя" />);
      expect(screen.getByText('Имя')).toBeInTheDocument();
      const input = screen.getByPlaceholderText('Введите имя');
      fireEvent.change(input, { target: { value: 'Иван' } });
      expect(handleChange).toHaveBeenCalled();
    });

    it('renders error message', () => {
      render(<Input error="Поле обязательно" />);
      expect(screen.getByText('Поле обязательно')).toBeInTheDocument();
    });
  });

  describe('FilterPill', () => {
    it('renders label and count', () => {
      const handleClick = vi.fn();
      render(<FilterPill active={true} count={5} label="Все" onClick={handleClick} />);
      expect(screen.getByText('Все')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('ConfirmDialog', () => {
    it('handles confirm and cancel actions', () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();
      render(
        <ConfirmDialog
          isOpen={true}
          title="Удалить запись?"
          message="Вы уверены?"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );
      expect(screen.getByText('Удалить запись?')).toBeInTheDocument();
      expect(screen.getByText('Вы уверены?')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Подтвердить'));
      expect(handleConfirm).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('Отмена'));
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sheet / Drawer', () => {
    it('renders when isOpen is true and calls onClose on close button click', () => {
      const handleClose = vi.fn();
      render(
        <Sheet isOpen={true} onClose={handleClose} title="Заявка #13" description="Детали сделки">
          <p>Sheet Content</p>
        </Sheet>
      );
      expect(screen.getByText('Заявка #13')).toBeInTheDocument();
      expect(screen.getByText('Детали сделки')).toBeInTheDocument();
      expect(screen.getByText('Sheet Content')).toBeInTheDocument();

      const closeBtn = screen.getByLabelText('Закрыть');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not render when isOpen is false', () => {
      render(
        <Sheet isOpen={false} onClose={() => {}} title="Скрытая панель">
          <p>Hidden</p>
        </Sheet>
      );
      expect(screen.queryByText('Скрытая панель')).not.toBeInTheDocument();
    });
  });

  describe('Card', () => {
    it('renders header, content and footer', () => {
      render(
        <Card header={<div>Заголовок карточки</div>} footer={<div>Подвал карточки</div>}>
          <div>Основной контент</div>
        </Card>
      );
      expect(screen.getByText('Заголовок карточки')).toBeInTheDocument();
      expect(screen.getByText('Основной контент')).toBeInTheDocument();
      expect(screen.getByText('Подвал карточки')).toBeInTheDocument();
    });
  });

  describe('Skeleton', () => {
    it('renders skeleton placeholder with custom dimensions', () => {
      const { container } = render(<Skeleton width="120px" height="24px" />);
      const skeleton = container.querySelector('.crm-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveStyle({ width: '120px', height: '24px' });
    });
  });

  describe('EmptyState', () => {
    it('renders title, description and action', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="Заявок нет"
          description="Создайте первую заявку для начала работы"
          action={<Button onClick={handleAction}>+ Создать заявку</Button>}
        />
      );
      expect(screen.getByText('Заявок нет')).toBeInTheDocument();
      expect(screen.getByText('Создайте первую заявку для начала работы')).toBeInTheDocument();
      
      const actionBtn = screen.getByText('+ Создать заявку');
      fireEvent.click(actionBtn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });
});
