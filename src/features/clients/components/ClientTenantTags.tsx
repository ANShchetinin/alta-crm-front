import type { UserTenant } from '../../../api/auth';

interface ClientTenantTagsProps {
  tenantIds?: number[];
  tenants: UserTenant[];
  currentTenantId: number;
}

/** Метки компаний владельца, в которых доступен клиент (показываются, только если компаний несколько). */
export const ClientTenantTags = ({ tenantIds, tenants, currentTenantId }: ClientTenantTagsProps) => {
  if (tenants.length <= 1 || !tenantIds || tenantIds.length === 0) {
    return null;
  }
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
      {tenantIds.map(tenantId => {
        const tenant = tenants.find(x => x.tenantId === tenantId);
        if (!tenant) {
          return null;
        }
        const isCurrent = tenant.tenantId === currentTenantId;
        return (
          <span
            key={tenantId}
            style={{
              fontSize: '0.68rem',
              padding: '1px 6px',
              borderRadius: '4px',
              background: isCurrent ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${isCurrent ? 'rgba(59, 130, 246, 0.3)' : 'var(--glass-border)'}`,
              color: isCurrent ? '#60a5fa' : 'var(--text-secondary)',
              fontWeight: 500
            }}
          >
            {tenant.name}
          </span>
        );
      })}
    </div>
  );
};
