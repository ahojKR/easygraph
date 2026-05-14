'use client';

import { useState, useEffect } from 'react';
import {
  loadTemplates, deleteTemplate, formatTemplateDate,
  AnalysisTemplate,
} from '@/lib/templateStore';
import styles from './TemplatePicker.module.css';
import { Bookmark, Trash2, ChevronRight, Clock } from 'lucide-react';

interface Props {
  onApply: (tpl: AnalysisTemplate) => void;
}

export default function TemplatePicker({ onApply }: Props) {
  const [templates, setTemplates] = useState<AnalysisTemplate[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, [open]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTemplate(id);
    setTemplates(loadTemplates());
  };

  if (templates.length === 0) return null;

  return (
    <div className={styles.root}>
      <button
        id="template-picker-btn"
        className={styles.trigger}
        onClick={() => setOpen(v => !v)}
      >
        <Bookmark size={14} />
        저장된 분석 템플릿 ({templates.length})
        <ChevronRight size={13} className={open ? styles.chevronOpen : styles.chevron} />
      </button>

      {open && (
        <div className={styles.dropdown}>
          {templates.map(tpl => (
            <div
              key={tpl.id}
              className={styles.item}
              onClick={() => { onApply(tpl); setOpen(false); }}
              id={`template-${tpl.id}`}
            >
              <div className={styles.itemMain}>
                <span className={styles.itemName}>{tpl.name}</span>
                <span className={styles.itemMeta}>
                  <Clock size={11} />
                  {formatTemplateDate(tpl.createdAt)}
                  &nbsp;·&nbsp;
                  {tpl.periods.map(p => p.label).join(' / ')}
                  {tpl.yoyPairs.length > 0 && ' · YoY'}
                </span>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={(e) => handleDelete(tpl.id, e)}
                title="템플릿 삭제"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
