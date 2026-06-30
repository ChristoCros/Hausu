'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Check, ClipboardList } from 'lucide-react';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoColumn {
  id: string;
  title: string;
  items: TodoItem[];
}

interface TodoDashboardProps {
  theme: 'classic' | 'nier';
}

export default function TodoDashboard({ theme }: TodoDashboardProps) {
  const [columns, setColumns] = useState<TodoColumn[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newInputs, setNewInputs] = useState<{ [columnId: string]: string }>({});
  const [confirmDeleteColId, setConfirmDeleteColId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = window.localStorage.getItem('hausu_todos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setColumns(parsed);
        } else {
          console.warn("Todos loaded from localStorage are not in array format, ignoring.");
        }
      } catch (e) {
        console.error("Failed to parse todos from localStorage", e);
      }
    } else {
      // Default starting columns
      setColumns([
        {
          id: 'col-1',
          title: 'Maison',
          items: [
            { id: 'item-1', text: 'Vérifier la production solaire', completed: true },
            { id: 'item-2', text: 'Nettoyer le capteur de température extérieur', completed: false },
          ]
        },
        {
          id: 'col-2',
          title: 'Travail',
          items: [
            { id: 'item-3', text: 'Ajuster les seuils du ClimateTornado', completed: false },
            { id: 'item-4', text: 'Optimiser les requêtes API Shelly', completed: false }
          ]
        }
      ]);
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage when columns change
  useEffect(() => {
    if (isInitialized) {
      window.localStorage.setItem('hausu_todos', JSON.stringify(columns));
    }
  }, [columns, isInitialized]);

  // Add a new column
  const handleAddColumn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = newColumnTitle.trim() || `Liste ${columns.length + 1}`;
    const newCol: TodoColumn = {
      id: `col-${Date.now()}`,
      title,
      items: []
    };
    setColumns([...columns, newCol]);
    setNewColumnTitle('');
  };

  // Delete a column with dynamic inline confirmation
  const handleDeleteColumn = (columnId: string) => {
    if (confirmDeleteColId === columnId) {
      setColumns(columns.filter(col => col.id !== columnId));
      setConfirmDeleteColId(null);
    } else {
      setConfirmDeleteColId(columnId);
      // Automatically reset confirmation state after 4 seconds if not clicked again
      setTimeout(() => {
        setConfirmDeleteColId(current => current === columnId ? null : current);
      }, 4000);
    }
  };

  // Update column title
  const handleUpdateColumnTitle = (columnId: string, newTitle: string) => {
    setColumns(columns.map(col => {
      if (col.id === columnId) {
        return { ...col, title: newTitle };
      }
      return col;
    }));
  };

  // Add item to a column
  const handleAddItem = (columnId: string) => {
    const text = newInputs[columnId]?.trim();
    if (!text) return;

    setColumns(columns.map(col => {
      if (col.id === columnId) {
        const newItem: TodoItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text,
          completed: false
        };
        return {
          ...col,
          items: [...col.items, newItem]
        };
      }
      return col;
    }));

    setNewInputs({
      ...newInputs,
      [columnId]: ''
    });
  };

  // Handle Enter key for adding items
  const handleKeyPress = (e: React.KeyboardEvent, columnId: string) => {
    if (e.key === 'Enter') {
      handleAddItem(columnId);
    }
  };

  // Toggle item completion
  const handleToggleItem = (columnId: string, itemId: string) => {
    setColumns(columns.map(col => {
      if (col.id === columnId) {
        return {
          ...col,
          items: col.items.map(item => {
            if (item.id === itemId) {
              return { ...item, completed: !item.completed };
            }
            return item;
          })
        };
      }
      return col;
    }));
  };

  // Delete item from a column
  const handleDeleteItem = (columnId: string, itemId: string) => {
    setColumns(columns.map(col => {
      if (col.id === columnId) {
        return {
          ...col,
          items: col.items.filter(item => item.id !== itemId)
        };
      }
      return col;
    }));
  };

  // Update a single todo item's text (e.g. for typo fixes)
  const handleUpdateItemText = (columnId: string, itemId: string, newText: string) => {
    setColumns(columns.map(col => {
      if (col.id === columnId) {
        return {
          ...col,
          items: col.items.map(item => {
            if (item.id === itemId) {
              return { ...item, text: newText };
            }
            return item;
          })
        };
      }
      return col;
    }));
  };

  return (
    <div className="todo-dashboard-container">
      <div className="todo-header panel">
        <div className="todo-header-title">
          <ClipboardList size={22} className="text-orange" />
          <h2>{theme === 'nier' ? 'PLANIFICATEUR // SYSTEM' : 'PLANIFICATEUR & ACTIONS'}</h2>
        </div>
        <form onSubmit={handleAddColumn} className="todo-add-column-form">
          <input
            type="text"
            placeholder={theme === 'nier' ? 'NOM DE LA LISTE...' : 'Nom de la nouvelle liste...'}
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            className="todo-column-input"
          />
          <button type="submit" className="todo-add-col-btn">
            <Plus size={16} />
            <span>{theme === 'nier' ? 'CRÉER LISTE' : 'Ajouter'}</span>
          </button>
        </form>
      </div>

      <div className="todo-board">
        {columns.map(column => (
          <div key={column.id} className="todo-column-panel panel">
            <div className="todo-column-header">
              <input
                type="text"
                value={column.title}
                onChange={(e) => handleUpdateColumnTitle(column.id, e.target.value)}
                className="todo-column-title-input"
                title="Double-cliquez pour renommer"
              />
              <button
                onClick={() => handleDeleteColumn(column.id)}
                className={`todo-delete-column-btn ${confirmDeleteColId === column.id ? 'confirm-delete' : ''}`}
                title={confirmDeleteColId === column.id ? "Confirmer la suppression" : "Supprimer la liste"}
              >
                {confirmDeleteColId === column.id ? (
                  theme === 'nier' ? (
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#a0403d', letterSpacing: '0.5px' }}>SÛR ?</span>
                  ) : (
                    <Check size={15} color="#ef5350" strokeWidth={2.5} className="glow-active" />
                  )
                ) : (
                  <Trash2 size={15} />
                )}
              </button>
            </div>

            <div className="todo-add-item-row">
              <input
                type="text"
                placeholder={theme === 'nier' ? 'NOUVELLE ACTION...' : 'Ajouter une action...'}
                value={newInputs[column.id] || ''}
                onChange={(e) => setNewInputs({ ...newInputs, [column.id]: e.target.value })}
                onKeyDown={(e) => handleKeyPress(e, column.id)}
                className="todo-item-input"
              />
              <button
                onClick={() => handleAddItem(column.id)}
                className="todo-add-item-btn"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="todo-items-list">
              {column.items.length === 0 ? (
                <div className="todo-empty-state">
                  <span>{theme === 'nier' ? 'AUCUNE ACTION // VIDE' : 'Aucune action.'}</span>
                </div>
              ) : (
                column.items.map(item => (
                  <div
                    key={item.id}
                    className={`todo-item-card ${item.completed ? 'completed' : ''}`}
                  >
                    <div className="todo-item-content">
                      <label className="todo-checkbox-wrapper">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleItem(column.id, item.id)}
                          className="todo-checkbox-hidden"
                        />
                        <span className="todo-checkbox-custom">
                          {item.completed && <Check size={12} strokeWidth={3} />}
                        </span>
                      </label>
                      <span
                        contentEditable={!item.completed}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => handleUpdateItemText(column.id, item.id, e.currentTarget.innerText || '')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        className="todo-item-text"
                        title={item.completed ? "" : (theme === 'nier' ? 'CLIQUEZ POUR MODIFIER' : 'Cliquez pour modifier')}
                      >
                        {item.text}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteItem(column.id, item.id)}
                      className="todo-item-delete-btn"
                      title="Supprimer l'action"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}

        <div onClick={() => handleAddColumn()} className="todo-add-column-placeholder">
          <Plus size={24} />
          <span>{theme === 'nier' ? 'NOUVELLE LISTE' : 'Créer une liste'}</span>
        </div>
      </div>
    </div>
  );
}
