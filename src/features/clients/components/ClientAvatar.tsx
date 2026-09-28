import { Building2 } from 'lucide-react';
import type { Client } from '../../../api/clients';
import { getAvatarGradient, getClientInitials } from '../../../utils/avatarUtils';

/** Круглый аватар клиента: фото, иначе инициалы (физлицо) или значок здания (юрлицо) на цветном фоне. */
export const ClientAvatar = ({ client }: { client: Client }) => {
  const isLegal = client.clientType === 'LEGAL_ENTITY';
  return (
    <div style={{
      width: '38px',
      height: '38px',
      borderRadius: '50%',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.82rem',
      fontWeight: 700,
      color: '#fff',
      background: client.avatarUrl ? 'transparent' : getAvatarGradient(client.name || (isLegal ? 'Компания' : 'Клиент')),
      border: '1.5px solid rgba(255, 255, 255, 0.15)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      flexShrink: 0
    }}>
      {client.avatarUrl ? (
        <img src={client.avatarUrl} alt={client.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        isLegal ? <Building2 size={18} /> : getClientInitials(client.name)
      )}
    </div>
  );
};
