import React from 'react';

type BadgeVariant = 'available' | 'taken' | 'returned' | 'restricted';

interface BadgeProps {
  children: React.ReactNode;
  variant: BadgeVariant;
}

const Badge: React.FC<BadgeProps> = ({ children, variant }) => {
  const base = "status-badge";
  const variants = {
    available: `${base} available`,
    taken: `${base} taken`,
    returned: `${base} returned`,
    restricted: `${base} restricted`,
  };

  return <span className={variants[variant]}>{children}</span>;
};

export default Badge;