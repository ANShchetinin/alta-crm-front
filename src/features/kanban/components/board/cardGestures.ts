import type { SyntheticEvent } from 'react';

/** Ссылки и кнопки внутри карточки не должны открывать заявку и запускать перетаскивание. */
export const stopCardGesture = {
  onTouchStart: (e: SyntheticEvent) => e.stopPropagation(),
  onTouchEnd: (e: SyntheticEvent) => e.stopPropagation(),
  onClick: (e: SyntheticEvent) => e.stopPropagation()
};
