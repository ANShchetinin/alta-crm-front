import { Plus } from 'lucide-react';

interface AddColumnButtonProps {
  onClick: () => void;
}

/** Кнопка «Добавить колонку» в конце доски и списка этапов. */
export const AddColumnButton = ({ onClick }: AddColumnButtonProps) => (
  <button type="button" className="kanban-add-column-btn" onClick={onClick}>
    <Plus size={18} /> Добавить колонку
  </button>
);
