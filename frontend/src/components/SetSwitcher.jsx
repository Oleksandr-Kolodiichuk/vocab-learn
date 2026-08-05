export default function SetSwitcher({ sets, currentSetId, onSelect, onCreate, onRename, onDelete }) {
  const current = sets.find((s) => s.id === currentSetId);

  const handleCreate = () => {
    const name = window.prompt('Name des neuen Sets:');
    if (name && name.trim()) onCreate(name.trim());
  };

  const handleRename = () => {
    if (!current) return;
    const name = window.prompt('Set umbenennen:', current.name);
    if (name && name.trim() && name.trim() !== current.name) onRename(current.id, name.trim());
  };

  const handleDelete = () => {
    if (!current) return;
    if (
      window.confirm(
        `Set "${current.name}" löschen (${current.card_count} Karten)? Dies kann nicht rückgängig gemacht werden.`
      )
    ) {
      onDelete(current.id);
    }
  };

  return (
    <div className="set-switcher">
      <select
        className="set-select"
        value={currentSetId ?? ''}
        onChange={(e) => onSelect(Number(e.target.value))}
      >
        {sets.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.card_count})
          </option>
        ))}
      </select>
      <button className="set-action" onClick={handleCreate} title="Neues Set erstellen">
        +
      </button>
      <button className="set-action" onClick={handleRename} title="Set umbenennen" disabled={!current}>
        ✎
      </button>
      <button
        className="set-action set-action-delete"
        onClick={handleDelete}
        title="Set löschen"
        disabled={!current}
      >
        🗑
      </button>
    </div>
  );
}
