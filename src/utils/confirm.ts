import { useConfirmStore, type ConfirmOptions } from '../store/useConfirmStore';

/**
 * Opens a modal confirmation dialog and returns a Promise that resolves to true (Confirmed) or false (Cancelled).
 */
export const confirm = (options: ConfirmOptions | string): Promise<boolean> => {
  const normalizedOptions: ConfirmOptions = typeof options === 'string'
    ? { title: options }
    : options;

  return new Promise((resolve) => {
    useConfirmStore.getState().openConfirm({
      ...normalizedOptions,
      resolve
    });
  });
};
