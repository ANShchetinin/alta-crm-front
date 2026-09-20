import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Trash2,
  Copy,
  Check,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  UserX,
  Edit2
} from 'lucide-react';
import {
  getOrderComments,
  addOrderComment,
  updateOrderComment,
  deleteOrderComment,
  type OrderComment
} from '../../../api/kanban';
import { useAuthStore } from '../../../store/useAuthStore';
import { useAppStore } from '../../../store/useAppStore';
import { formatDateTimeInTimezone } from '../../../utils/dateUtils';
import { toast } from '../../../utils/toast';
import { confirm } from '../../../utils/confirm';

export interface OrderCommentsSectionProps {
  orderId: number;
  onCommentsCountChange?: (count: number) => void;
  defaultExpanded?: boolean;
}

const getAvatarGradient = (name: string) => {
  const gradients = [
    'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};

const getInitials = (name: string) => {
  if (!name) {
    return 'С';
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

/**
 * Компонент отображения и добавления комментариев в основном разделе карточки заказа.
 */
export const OrderCommentsSection: React.FC<OrderCommentsSectionProps> = ({
  orderId,
  onCommentsCountChange,
  defaultExpanded = false
}) => {
  const [comments, setComments] = useState<OrderComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const userId = useAuthStore(state => state.userId);
  const { tenantSettings } = useAppStore();

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const onCommentsCountChangeRef = useRef(onCommentsCountChange);
  useEffect(() => {
    onCommentsCountChangeRef.current = onCommentsCountChange;
  }, [onCommentsCountChange]);

  useEffect(() => {
    if (defaultExpanded) {
      setIsExpanded(true);
    }
  }, [defaultExpanded]);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOrderComments(orderId);
      setComments(data);
      if (onCommentsCountChangeRef.current) {
        onCommentsCountChangeRef.current(data.length);
      }
    } catch (err) {
      console.error('Failed to load comments', err);
      toast.error('Не удалось загрузить комментарии');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (typeof commentsEndRef.current?.scrollIntoView === 'function') {
        commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const handleAddComment = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = newCommentText.trim();
    if (!trimmed || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      const created = await addOrderComment(orderId, trimmed);
      const updated = [...comments, created];
      setComments(updated);
      setNewCommentText('');
      setIsExpanded(true);
      if (onCommentsCountChangeRef.current) {
        onCommentsCountChangeRef.current(updated.length);
      }
      window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'comment', orderId } }));
      scrollToBottom();
      toast.success('Комментарий добавлен');
    } catch (err: any) {
      console.error('Failed to add comment', err);
      const msg = err.response?.data?.message || err.message || 'Ошибка добавления комментария';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const ok = await confirm({
      title: 'Удаление комментария',
      message: 'Вы уверены, что хотите удалить этот комментарий?',
      confirmText: 'Удалить',
      danger: true
    });
    if (!ok) {
      return;
    }

    try {
      await deleteOrderComment(orderId, commentId);
      const updated = comments.filter(c => c.id !== commentId);
      setComments(updated);
      if (onCommentsCountChangeRef.current) {
        onCommentsCountChangeRef.current(updated.length);
      }
      window.dispatchEvent(new CustomEvent('alta:orders-changed', { detail: { action: 'comment', orderId } }));
      toast.success('Комментарий удален');
    } catch (err: any) {
      console.error('Failed to delete comment', err);
      const msg = err.response?.data?.message || err.message || 'Ошибка удаления комментария';
      toast.error(msg);
    }
  };

  const handleCopyComment = (comment: OrderComment, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    navigator.clipboard.writeText(comment.text);
    setCopiedId(comment.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleAddComment(e);
    }
  };

  const canDeleteComment = (comment: OrderComment) => {
    if (userId == null || comment.authorDeleted || comment.authorName === 'Пользователь удален') {
      return false;
    }
    return comment.authorUserId != null && comment.authorUserId === userId;
  };

  const canEditComment = (comment: OrderComment) => {
    if (userId == null || comment.authorDeleted || comment.authorName === 'Пользователь удален') {
      return false;
    }
    return comment.authorUserId != null && comment.authorUserId === userId;
  };

  const handleStartEdit = (comment: OrderComment, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingCommentId(comment.id);
    setEditingText(comment.text);
    setTimeout(() => {
      editTextareaRef.current?.focus();
      editTextareaRef.current?.select();
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleSaveEdit = async (commentId: number) => {
    const trimmed = editingText.trim();
    if (!trimmed || editSubmitting) {
      return;
    }
    try {
      setEditSubmitting(true);
      const updated = await updateOrderComment(orderId, commentId, trimmed);
      setComments(prev => prev.map(c => (c.id === commentId ? updated : c)));
      setEditingCommentId(null);
      setEditingText('');
      toast.success('Комментарий изменен');
    } catch (err: any) {
      console.error('Failed to update comment', err);
      const msg = err.response?.data?.message || err.message || 'Ошибка изменения комментария';
      toast.error(msg);
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div
      id="order-comments-section"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        marginBottom: '16px'
      }}
    >
      {/* Clickable Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          gap: '8px'
        }}
        onClick={() => setIsExpanded(prev => !prev)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={17} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            Комментарии к заказу
          </h4>
          <span
            style={{
              background: comments.length > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.06)',
              color: comments.length > 0 ? '#60a5fa' : 'var(--text-secondary)',
              padding: '1px 8px',
              borderRadius: '10px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            {comments.length}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(prev => !prev);
          }}
          className="btn-icon"
          style={{
            padding: '4px',
            color: 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.8rem'
          }}
          title={isExpanded ? 'Свернуть комментарии' : 'Развернуть комментарии'}
        >
          <span style={{ fontSize: '0.78rem' }}>{isExpanded ? 'Свернуть' : 'Развернуть'}</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded Content: Comments List + Input Box */}
      {isExpanded && (
        <div style={{ marginTop: '14px', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 0',
                gap: '8px',
                color: 'var(--text-secondary)'
              }}
            >
              <Loader2 className="animate-spin" size={20} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: '0.82rem' }}>Загрузка комментариев...</span>
            </div>
          ) : comments.length === 0 ? (
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px dashed var(--glass-border)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '14px'
              }}
            >
              Комментариев пока нет. Оставьте первый комментарий к заказу ниже.
            </div>
          ) : (
            <div
              style={{
                maxHeight: '280px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                paddingRight: '4px',
                marginBottom: '14px'
              }}
            >
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--glass-border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      {(() => {
                        const isDeleted = Boolean(comment.authorDeleted || comment.authorName === 'Пользователь удален');
                        const displayName = isDeleted ? 'Пользователь удален' : (comment.authorName || 'Сотрудник');
                        return (
                          <>
                            <div
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: isDeleted
                                  ? 'rgba(255, 255, 255, 0.08)'
                                  : (comment.authorAvatarUrl ? 'transparent' : getAvatarGradient(displayName)),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isDeleted ? 'var(--text-secondary)' : '#fff',
                                fontWeight: 700,
                                fontSize: '0.65rem',
                                flexShrink: 0,
                                overflow: 'hidden'
                              }}
                            >
                              {isDeleted ? (
                                <UserX size={13} style={{ color: 'var(--text-secondary)' }} />
                              ) : comment.authorAvatarUrl ? (
                                <img
                                  src={comment.authorAvatarUrl}
                                  alt={displayName}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                getInitials(displayName)
                              )}
                            </div>

                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: '0.84rem',
                                color: isDeleted ? 'var(--text-secondary)' : 'var(--text-primary)',
                                fontStyle: isDeleted ? 'italic' : 'normal',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {displayName}
                            </span>
                          </>
                        );
                      })()}

                      <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={11} />
                        {formatDateTimeInTimezone(comment.createdAt, tenantSettings?.timezone)}
                        {comment.updatedAt && (
                          <span
                            style={{ fontStyle: 'italic', marginLeft: '3px', opacity: 0.8 }}
                            title={`Изменено ${formatDateTimeInTimezone(comment.updatedAt, tenantSettings?.timezone)}`}
                          >
                            (изменено)
                          </span>
                        )}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={(e) => handleCopyComment(comment, e)}
                        className="btn-icon"
                        style={{ padding: '4px', color: copiedId === comment.id ? '#10b981' : 'var(--text-secondary)' }}
                        title="Скопировать комментарий"
                      >
                        {copiedId === comment.id ? <Check size={13} /> : <Copy size={13} />}
                      </button>

                      {canEditComment(comment) && editingCommentId !== comment.id && (
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(comment, e)}
                          className="btn-icon"
                          style={{ padding: '4px', color: 'var(--text-secondary)' }}
                          title="Редактировать комментарий"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}

                      {canDeleteComment(comment) && editingCommentId !== comment.id && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteComment(comment.id, e)}
                          className="btn-icon"
                          style={{ padding: '4px', color: '#ef4444' }}
                          title="Удалить комментарий"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {editingCommentId === comment.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      <textarea
                        ref={editTextareaRef}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSaveEdit(comment.id);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCancelEdit();
                          }
                        }}
                        disabled={editSubmitting}
                        rows={2}
                        style={{
                          width: '100%',
                          minHeight: '52px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          border: '1px solid var(--accent-primary)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          padding: '6px 10px',
                          fontSize: '0.86rem',
                          lineHeight: '1.4',
                          resize: 'vertical',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={editSubmitting}
                          className="btn btn-ghost"
                          style={{ padding: '4px 10px', fontSize: '0.78rem', height: '28px' }}
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(comment.id)}
                          disabled={!editingText.trim() || editSubmitting}
                          className="btn btn-primary"
                          style={{
                            padding: '4px 12px',
                            fontSize: '0.78rem',
                            height: '28px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {editSubmitting ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                          Сохранить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: '1.45', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {comment.text}
                    </div>
                  )}
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
          )}

          {/* Input Box - Notice: NO nested <form> tag to prevent bubbling to order drawer form! */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <textarea
              ref={textareaRef}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Написать комментарий к заказу... (Ctrl+Enter для отправки)"
              rows={2}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.86rem',
                lineHeight: '1.45',
                resize: 'vertical',
                minHeight: '40px',
                maxHeight: '140px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                padding: '2px'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                💡 Нажмите <strong>Ctrl+Enter</strong> для быстрой отправки
              </span>

              <button
                type="button"
                onClick={handleAddComment}
                disabled={!newCommentText.trim() || submitting}
                className="btn btn-primary"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={13} />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    Отправить
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
