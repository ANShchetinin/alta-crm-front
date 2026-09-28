import type { DragEvent, ReactNode, RefObject, TouchEvent } from 'react';
import type { Order, OrderStatus } from '../../../../api/kanban';

/** Общие свойства видов доски (колонки на десктопе и список-аккордеон на телефоне). */
export interface BoardViewProps {
  boardRef: RefObject<HTMLDivElement | null>;
  columns: OrderStatus[];
  cards: Order[];
  isWorker: boolean;
  renderCard: (card: Order) => ReactNode;
  /** Карточка, которую тянут пальцем, и колонка под ней. */
  touchDraggingCard: Order | null;
  touchTargetStatusId: number | null;
  touchTargetCardId: number | null;
  /** Перестановка колонок пальцем за ручку. */
  columnReorder: {
    draggingColId: number | null;
    targetColId: number | null;
    onTouchStart: (e: TouchEvent, colId: number) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: (e: TouchEvent) => void;
    onTouchCancel: () => void;
  };
}

/** Перетаскивание мышью на десктопе: карточек между колонками и самих колонок. */
export interface DesktopDragBindings {
  dragOverColId: number | null;
  onColumnDrop: (e: DragEvent, columnId: number) => void;
  onColumnDragOver: (e: DragEvent, columnId: number) => void;
  onColumnDragLeave: (e: DragEvent) => void;
}
