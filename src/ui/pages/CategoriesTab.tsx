import React from 'react';
import CategoryManager from '@/ui/organisms/CategoryManager';

interface CategoriesTabProps {
  onChange: () => void;
}

export default function CategoriesTab({ onChange }: CategoriesTabProps) {
  return (
    <div className="animate-fade-in">
      <CategoryManager onChange={onChange} />
    </div>
  );
}
